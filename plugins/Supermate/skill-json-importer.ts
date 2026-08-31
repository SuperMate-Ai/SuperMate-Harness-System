/**
 * skill-json-importer — .skill.json 导入插件
 *
 * 把第三方 "Skill JSON" 格式（{ skillMeta, execute }，如 LyricToStoryboard.skill.json）
 * 转成 DeepSeek Harness 原生 skill 目录（.dsh/skills/<kebab-name>/SKILL.md），
 * 由 skill-filesystem watcher 实时发现（无需重启）。
 *
 * 三个能力：
 *   1. import_skill_json —— 导入单个 .skill.json 文件（或粘贴 JSON 原文）
 *   2. scan_skill_json  —— 扫描目录里所有 *.skill.json，报告可导入/已存在/非法
 *   3. import_all_skill_jsons —— 把导入目录里全部合法且未导入的 .skill.json 一次性导入
 *
 * 开机自动导入：apply() 时扫描 <DSH_HOME>/skill-imports/ 目录，把尚未导入的
 * *.skill.json 自动写入 skills 目录（幂等：已存在的同名 skill 跳过）。
 *
 * 设计约束（与 dsh-asset-manager 一致）：
 *   - 运行时【零外部依赖】：不 import 任何 @deepseek-ai/* 运行时包（避免文件型
 *     插件在 DSH 加载器中的裸模块解析问题）；仅类型导入（编译期擦除）。
 *   - 文件读写用 node:fs（插件为宿主受信代码）。
 *   - 转换是纯文本生成，不执行 skill.json 里的任何代码/模板。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { JsonSchemaNode } from '@deepseek-ai/dsh-tools'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { watch } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'

export const name = 'skill-json-importer'
export const inject = ['tools']

/* ── 路径常量 ─────────────────────────────────────────────────────────── */
function dshHome(): string {
  return process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
}
const SKILLS_ROOT = () => join(dshHome(), 'skills')
const IMPORT_DIR = () => join(dshHome(), 'skill-imports')

/* ── skill 名转换：skillId "LyricToStoryboard" → "lyric-to-storyboard" ── */
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function toKebab(name: string): string {
  const s = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // camelCase → kebab
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // 连续大写边界
    .replace(/[^A-Za-z0-9]+/g, '-') // 其余非法字符 → '-'
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .replace(/-+/g, '-')
  return SKILL_NAME_RE.test(s) ? s : ''
}

/* ── skill.json 结构校验与提取 ────────────────────────────────────────── */
interface SkillJsonInput {
  skillId: string
  skillName: string
  description: string
  tags?: string[]
  inputSchema?: { properties?: Record<string, unknown>; required?: string[] }
  outputSchema?: { properties?: Record<string, unknown> }
  execute: {
    type?: string
    systemPrompt?: string
    userPromptTemplate?: string
    temperature?: number
    maxTokens?: number
  }
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export function parseSkillJson(raw: string, source: string): SkillJsonInput {
  let doc: unknown
  try {
    doc = JSON.parse(raw)
  } catch (error) {
    throw new Error(`JSON 解析失败（${source}）: ${(error as Error).message}`)
  }
  if (typeof doc !== 'object' || doc === null) throw new Error(`非法 skill.json（${source}）：顶层必须是对象`)
  const meta = (doc as { skillMeta?: unknown }).skillMeta
  if (typeof meta !== 'object' || meta === null) throw new Error(`非法 skill.json（${source}）：缺少 skillMeta`)
  const m = meta as Record<string, unknown>
  const exec = (doc as { execute?: unknown }).execute
  if (typeof exec !== 'object' || exec === null) throw new Error(`非法 skill.json（${source}）：缺少 execute`)
  const e = exec as Record<string, unknown>

  const skillId = asString(m.skillId)
  if (!skillId) throw new Error(`非法 skill.json（${source}）：skillMeta.skillId 缺失或为空`)
  const description = asString(m.description)
  if (!description) throw new Error(`非法 skill.json（${source}）：skillMeta.description 缺失或为空（DSH 要求非空 description）`)
  const systemPrompt = asString(e.systemPrompt)
  if (!systemPrompt) throw new Error(`非法 skill.json（${source}）：execute.systemPrompt 缺失或为空（仅支持 type=llm 类技能）`)

  const tags = Array.isArray(m.tags) ? m.tags.map((t) => asString(t)).filter(Boolean) : []
  const inputSchema = typeof m.inputSchema === 'object' && m.inputSchema !== null
    ? m.inputSchema as { properties?: Record<string, unknown>; required?: string[] }
    : undefined
  const outputSchema = typeof m.outputSchema === 'object' && m.outputSchema !== null
    ? m.outputSchema as { properties?: Record<string, unknown> }
    : undefined
  const temperature = typeof e.temperature === 'number' ? e.temperature : undefined
  const maxTokens = typeof e.maxTokens === 'number' ? e.maxTokens : undefined

  return {
    skillId,
    skillName: asString(m.skillName) || skillId,
    description,
    tags,
    inputSchema,
    outputSchema,
    execute: {
      type: asString(e.type) || 'llm',
      systemPrompt,
      userPromptTemplate: asString(e.userPromptTemplate),
      temperature,
      maxTokens,
    },
  }
}

/* ── SKILL.md 渲染 ────────────────────────────────────────────────────── */
function renderInputTable(schema?: { properties?: Record<string, unknown>; required?: string[] }): string {
  if (!schema?.properties) return ''
  const required = new Set((schema.required ?? []).map(String))
  const rows: string[] = []
  for (const [key, p] of Object.entries(schema.properties)) {
    const prop = (typeof p === 'object' && p !== null ? p : {}) as Record<string, unknown>
    const type = typeof prop.type === 'string' ? prop.type : 'string'
    const desc = asString(prop.description)
    const def = prop.default === undefined ? '' : `（默认 ${String(prop.default)}）`
    const req = required.has(key) ? '**必填**' : ''
    rows.push(`| \`${key}\` | ${type} | ${desc}${def} | ${req} |`)
  }
  if (!rows.length) return ''
  return ['| 字段 | 类型 | 说明 | 必填 |', '|---|---|---|---|', ...rows].join('\n')
}

function renderOutputTable(schema?: { properties?: Record<string, unknown> }): string {
  if (!schema?.properties) return ''
  const rows: string[] = []
  for (const [key, p] of Object.entries(schema.properties)) {
    const prop = (typeof p === 'object' && p !== null ? p : {}) as Record<string, unknown>
    rows.push(`| \`${key}\` | ${asString(prop.description)} |`)
  }
  if (!rows.length) return ''
  return ['| 字段 | 说明 |', '|---|---|', ...rows].join('\n')
}

export function renderSkillMarkdown(input: SkillJsonInput, source: string, importedAt: string): string {
  const frontmatter: string[] = [
    '---',
    `name: ${toKebab(input.skillId)}`,
    `description: ${input.description.replace(/\r?\n/g, ' ').replace(/"/g, '\\"')}`,
  ]
  if (input.tags.length) {
    frontmatter.push(`whenToUse: 来自标签：${input.tags.join('、')}。`)
  }
  frontmatter.push('---', '')

  const body: string[] = [
    `# ${input.skillName}`,
    '',
    `> 由 skill.json 导入（来源：${source}，导入时间：${importedAt}）。原 skillId：\`${input.skillId}\`。`,
    '',
    '## 输入参数',
    '',
    renderInputTable(input.inputSchema) || '（无声明）',
    '',
    '## 工作流程（systemPrompt）',
    '',
    input.execute.systemPrompt,
    '',
  ]

  if (input.execute.userPromptTemplate) {
    body.push('## 调用模板（userPromptTemplate）', '', '```text', input.execute.userPromptTemplate, '```', '')
    body.push(
      '> 模板中 `{{var}}` 为占位符，按「输入参数」表替换；也可直接用自然语言描述需求，由模型按流程执行。',
      '',
    )
  }

  const outTable = renderOutputTable(input.outputSchema)
  if (outTable) {
    body.push('## 输出结构（outputSchema）', '', outTable, '')
  }

  const execParams: string[] = []
  if (input.execute.temperature !== undefined) execParams.push(`temperature: ${input.execute.temperature}`)
  if (input.execute.maxTokens !== undefined) execParams.push(`maxTokens: ${input.execute.maxTokens}`)
  if (input.execute.type) execParams.push(`type: ${input.execute.type}`)
  if (execParams.length) {
    body.push('## 执行参数', '', `- ${execParams.join('；')}`, '')
  }

  body.push('---', '', '> 本文件由 skill-json-importer 生成；再次导入同名 skill 会覆盖本文件（带 overwrite）。')
  return frontmatter.join('\n') + body.join('\n') + '\n'
}

/* ── 写入 skills 目录（含路径安全与覆盖语义） ─────────────────────────── */
interface ImportResult {
  ok: boolean
  name: string
  dir: string
  path: string
  overwritten: boolean
  error?: string
}

export async function importSkillJson(raw: string, source: string, overwrite: boolean): Promise<ImportResult> {
  const input = parseSkillJson(raw, source)
  const kebab = toKebab(input.skillId)
  if (!kebab) throw new Error(`skillId "${input.skillId}" 无法转换为合法 skill 名（须为小写 kebab-case）`)

  const dir = join(SKILLS_ROOT(), kebab)
  const path = join(dir, 'SKILL.md')
  // 路径包含性自检（kebab 已通过白名单，双保险）
  if (basename(dir) !== kebab || extname(path) !== '.md') {
    throw new Error(`非法目标路径: ${path}`)
  }

  let exists = false
  try {
    await readFile(path, 'utf8')
    exists = true
  } catch {
    exists = false
  }
  if (exists && !overwrite) {
    return { ok: false, name: kebab, dir, path, overwritten: false, error: `同名 skill "${kebab}" 已存在（.dsh/skills/${kebab}/SKILL.md）；需要覆盖请传 overwrite=true` }
  }

  await mkdir(dir, { recursive: true })
  const md = renderSkillMarkdown(input, source, new Date().toISOString())
  await writeFile(path, md, 'utf8')

  console.log(`[skill-json-importer] ${overwrite && exists ? 'overwrite' : 'import'} ${kebab} <- ${source}`)
  return { ok: true, name: kebab, dir, path, overwritten: exists && overwrite }
}

/* ── 扫描 *.skill.json 文件 ───────────────────────────────────────────── */
async function scanDir(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.skill.json'))
    .map((e) => join(dir, e.name))
    .sort()
}

/* ── 工具 1：import_skill_json ────────────────────────────────────────── */
function registerImportSkillJson(ctx: Context): void {
  ctx.tools.register({
    name: 'import_skill_json',
    description:
      '导入一个第三方 .skill.json 技能文件（格式 { skillMeta, execute }）为 DSH 原生 skill：' +
      '解析校验 → 转换为 .dsh/skills/<kebab-name>/SKILL.md（frontmatter name/description + 工作流程正文），' +
      '由 skill-filesystem watcher 实时发现。支持从文件路径读取或直接粘贴 JSON 原文；' +
      '同名 skill 已存在时需 overwrite=true 才覆盖。',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '要导入的 .skill.json 文件路径（与 content 二选一）',
        },
        content: {
          type: 'string',
          description: 'skill.json 原文 JSON（与 file_path 二选一）',
        },
        overwrite: {
          type: 'boolean',
          description: '同名 skill 已存在时是否覆盖；缺省 false',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['ok', 'name', 'dir', 'path', 'overwritten'],
        properties: {
          ok: { type: 'boolean' },
          name: { type: 'string' },
          dir: { type: 'string' },
          path: { type: 'string' },
          overwritten: { type: 'boolean' },
          error: { type: 'string' },
        },
      } satisfies JsonSchemaNode,
      render: (_args, value) => [
        {
          type: 'text',
          text:
            value.ok
              ? `导入成功：${value.name}\n目录：${value.dir}\n${value.overwritten ? '（已覆盖旧版本）' : ''}`
              : `导入未执行：${value.error ?? '未知原因'}`,
        },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      exec.signal.throwIfAborted?.()
      const filePath = typeof args.file_path === 'string' ? args.file_path.trim() : ''
      const content = typeof args.content === 'string' ? args.content.trim() : ''
      if (!filePath && !content) throw new Error('必须提供 file_path 或 content 之一')
      if (filePath && content) throw new Error('file_path 与 content 只能提供其一')

      const overwrite = args.overwrite === true
      if (filePath) {
        let raw: string
        try {
          raw = await readFile(filePath, 'utf8')
        } catch (error) {
          throw new Error(`无法读取 ${filePath}: ${(error as Error).message}`)
        }
        const result = await importSkillJson(raw, filePath, overwrite)
        if (!result.ok) return result
        // 尽力即时注册到运行时 skill 服务（缺省 provider=runtime），失败不阻断
        try {
          const skills = (ctx as unknown as { skills?: { register: (s: unknown) => unknown } }).skills
          if (skills) {
            skills.register({
              name: result.name,
              description: (JSON.parse(raw) as { skillMeta?: { description?: string } }).skillMeta?.description ?? result.name,
              content: await readFile(result.path, 'utf8'),
              resourceBase: { kind: 'directory', path: result.dir },
            })
          }
        } catch { /* runtime 注册尽力而为 */ }
        return result
      }
      return await importSkillJson(content, 'inline-json', overwrite)
    },
  })
}

/* ── 工具 2：scan_skill_json ──────────────────────────────────────────── */
function registerScanSkillJson(ctx: Context): void {
  ctx.tools.register({
    name: 'scan_skill_json',
    description:
      '扫描目录中所有 *.skill.json 文件，逐一校验并报告可导入/已存在/非法，不执行导入。' +
      '缺省扫描 .dsh/skill-imports/（开机自动导入目录）。',
    parameters: {
      type: 'object',
      properties: {
        dir: {
          type: 'string',
          description: '要扫描的目录；缺省 <DSH_HOME>/skill-imports/',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['dir', 'files', 'importable', 'already_imported', 'invalid'],
        properties: {
          dir: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          importable: { type: 'array', items: { type: 'string' } },
          already_imported: { type: 'array', items: { type: 'string' } },
          invalid: { type: 'array', items: { type: 'string' } },
        },
      },
      render: (_args, value) => {
        const lines: string[] = [`扫描目录：${value.dir}`, `文件 ${value.files.length} 个`]
        if (value.importable.length) lines.push(`\n[可导入 ${value.importable.length}]`)
        for (const f of value.importable) lines.push(`- ${f}`)
        if (value.already_imported.length) lines.push(`\n[已存在（需 overwrite） ${value.already_imported.length}]`)
        for (const f of value.already_imported) lines.push(`- ${f}`)
        if (value.invalid.length) lines.push(`\n[非法 ${value.invalid.length}]`)
        for (const f of value.invalid) lines.push(`- ${f}`)
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      exec.signal.throwIfAborted?.()
      const dir = typeof args.dir === 'string' && args.dir.trim() ? args.dir.trim() : IMPORT_DIR()
      const files = await scanDir(dir)
      const importable: string[] = []
      const already: string[] = []
      const invalid: string[] = []
      for (const f of files) {
        try {
          const raw = await readFile(f, 'utf8')
          const input = parseSkillJson(raw, f)
          const kebab = toKebab(input.skillId)
          if (!kebab) { invalid.push(f); continue }
          let exists = false
          try { await readFile(join(SKILLS_ROOT(), kebab, 'SKILL.md'), 'utf8'); exists = true } catch { /* not exists */ }
          ;(exists ? already : importable).push(f)
        } catch {
          invalid.push(f)
        }
      }
      return { dir, files, importable, already_imported: already, invalid }
    },
  })
}

/* ── 工具 3：import_all_skill_jsons ───────────────────────────────────── */
function registerImportAllSkillJsons(ctx: Context): void {
  ctx.tools.register({
    name: 'import_all_skill_jsons',
    description:
      '把目录中所有合法且尚未导入的 *.skill.json 一次性导入（幂等，已存在的跳过；' +
      'overwrite 为 true 时全部重新导入覆盖）。缺省目录 <DSH_HOME>/skill-imports/。',
    parameters: {
      type: 'object',
      properties: {
        dir: {
          type: 'string',
          description: '要扫描的目录；缺省 <DSH_HOME>/skill-imports/',
        },
        overwrite: {
          type: 'boolean',
          description: '已存在的同名 skill 是否覆盖；缺省 false',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['dir', 'imported', 'skipped', 'failed'],
        properties: {
          dir: { type: 'string' },
          imported: { type: 'array', items: { type: 'string' } },
          skipped: { type: 'array', items: { type: 'string' } },
          failed: { type: 'array', items: { type: 'string' } },
        },
      },
      render: (_args, value) => [
        {
          type: 'text',
          text:
            `导入完成（${value.dir}）\n` +
            `成功 ${value.imported.length}：${value.imported.join(', ') || '-'}\n` +
            `跳过 ${value.skipped.length}：${value.skipped.join(', ') || '-'}\n` +
            `失败 ${value.failed.length}：${value.failed.join(', ') || '-'}`,
        },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      exec.signal.throwIfAborted?.()
      const dir = typeof args.dir === 'string' && args.dir.trim() ? args.dir.trim() : IMPORT_DIR()
      const overwrite = args.overwrite === true
      const files = await scanDir(dir)
      const imported: string[] = []
      const skipped: string[] = []
      const failed: string[] = []
      for (const f of files) {
        try {
          const raw = await readFile(f, 'utf8')
          const result = await importSkillJson(raw, f, overwrite)
          if (result.ok) imported.push(result.name)
          else skipped.push(`${result.name}（${result.error ?? '跳过'}）`)
        } catch (error) {
          failed.push(`${basename(f)}（${(error as Error).message}）`)
        }
      }
      return { dir, imported, skipped, failed }
    },
  })
}

/* ── 导入目录同步：drop-in 即导入，编辑即更新 ─────────────────────────── */
const seenMtimes = new Map<string, number>()

/**
 * 扫描导入目录并导入新增/变更的 *.skill.json。
 * - 未见过的文件 → 导入（overwrite=false）
 * - mtime 变化（用户编辑）→ 重新导入（overwrite=true，更新已装 skill）
 * - 已删除的文件 → 保留已装 skill（安全默认，不自动卸载）
 */
export async function syncImportDir(dir: string): Promise<{ imported: string[]; skipped: string[] }> {
  const files = await scanDir(dir)
  const present = new Set(files)
  for (const key of [...seenMtimes.keys()]) {
    if (!present.has(key)) seenMtimes.delete(key)
  }
  const imported: string[] = []
  const skipped: string[] = []
  for (const f of files) {
    try {
      const info = await stat(f)
      const mtime = info.mtimeMs
      if (seenMtimes.get(f) === mtime) {
        skipped.push(basename(f))
        continue
      }
      const raw = await readFile(f, 'utf8')
      const result = await importSkillJson(raw, f, seenMtimes.has(f))
      seenMtimes.set(f, mtime)
      if (result.ok) imported.push(result.name)
      else skipped.push(`${basename(f)}（${result.error ?? '跳过'}）`)
    } catch (error) {
      skipped.push(`${basename(f)}（${(error as Error).message}）`)
    }
  }
  return { imported, skipped }
}

/** 监视导入目录：任何变化后去抖 600ms 再同步一次；返回关闭函数。 */
export function watchImportDir(dir: string, log: (msg: string) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let closed = false
  const trigger = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      if (closed) return
      void syncImportDir(dir).then(({ imported, skipped }) => {
        if (imported.length) log(`[skill-json-importer] watch: 导入 ${imported.join(', ')}`)
        if (skipped.length) log(`[skill-json-importer] watch: 跳过 ${skipped.length}（${skipped.join('；')}）`)
      })
    }, 600)
  }
  let watcher: ReturnType<typeof watch> | undefined
  try {
    watcher = watch(dir, { persistent: false }, trigger)
  } catch (error) {
    log(`[skill-json-importer] watch 建立失败: ${(error as Error).message}`)
    return () => { closed = true }
  }
  return () => {
    closed = true
    if (timer !== undefined) clearTimeout(timer)
    watcher?.close()
  }
}

export function apply(ctx: Context): void {
  console.log('[skill-json-importer] plugin loaded!')
  registerImportSkillJson(ctx)
  registerScanSkillJson(ctx)
  registerImportAllSkillJsons(ctx)
  void (async () => {
    const dir = IMPORT_DIR()
    try {
      await mkdir(dir, { recursive: true })
      // 心跳：证明插件已被本进程装载（排查用，也便于确认 watcher 存活）
      await writeFile(
        join(dir, '.plugin-heartbeat.log'),
        `skill-json-importer loaded at ${new Date().toISOString()} (pid ${process.pid})\n`,
        { flag: 'a' },
      )
    } catch { /* 忽略 */ }
    const log = (msg: string): void => console.log(msg)
    try {
      const { imported } = await syncImportDir(dir)
      if (imported.length) log(`[skill-json-importer] boot import: ${imported.join(', ')}`)
    } catch (error) {
      console.warn(`[skill-json-importer] boot import 失败: ${(error as Error).message}`)
    }
    const close = watchImportDir(dir, log)
    ctx.on('dispose', close)
  })()
}
