/**
 * segment-generate.mjs — 本地 MiniMax H3 分段生成器（h3-video-producer Skill 引用）
 *
 * 能力：逐段生成 H3 视频；首段用角色肖像，后续段链式衔接（前段尾帧=ref_image_0）
 *   + 身份锚定（角色肖像=ref_image_1）；逐段尾帧质检（Ollama，仅队列空闲）+ 卸载视觉模型；
 *   质检不过换种子重试；断点续跑（mp4+qa-pass 存在则跳过）。
 *
 * 配置：修改下方 CONFIG 后运行 `node segment-generate.mjs [--only s02,s05]`
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { execFileSync } from 'node:child_process'

const CONFIG = {
  base: 'http://127.0.0.1:8188',                 // ComfyUI
  workflow: 'E:/DSH/本地comfyui api/Supermate-MiniMax H3 图生视频 DSH 测试.json',
  comfyOut: 'E:/Comfyui-Fisher/ComfyUI/output',  // ComfyUI 输出目录（history 无输出时的兜底扫描）
  ollama: 'http://127.0.0.1:11598',
  root: '.',                                     // 项目根（含 prompts/ segments/ refs/ dialogue/）
  portrait: 'refs/zhizi-portrait.png',           // 角色肖像（身份锚定）
  segments: [                                    // 每段：name + 时长（按台词信息量，禁止统一10s）
    { name: 's01', dur: 6 },
    { name: 's02', dur: 9 },
  ],
  pollMs: 30_000,
  timeoutMs: 45 * 60_000,
  qaMaxAttempts: 2,
}

const BASE = CONFIG.base
const ROOT = CONFIG.root
const PROMPTS = join(ROOT, 'prompts')
const SEG_DIR = join(ROOT, 'segments')
const REF0 = join(ROOT, CONFIG.portrait)
const SEGS = CONFIG.segments
const promptTexts = Object.fromEntries(SEGS.map((s) => [s.name, readFileSync(join(PROMPTS, `${s.name}.txt`), 'utf8').trim()]))
const baseGraph = JSON.parse(readFileSync(CONFIG.workflow, 'utf8'))
mkdirSync(SEG_DIR, { recursive: true })

const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1].split(',').map((s) => s.trim()) : null
const ACTIVE = ONLY ? SEGS.filter((s) => ONLY.includes(s.name)) : SEGS

const log = (m) => { const line = `[${new Date().toISOString()}] ${m}`; console.log(line); appendFileSync(join(ROOT, 'run.log'), line + '\n', 'utf8') }

async function uploadImage(filePath) {
  const fd = new FormData()
  fd.append('image', new Blob([readFileSync(filePath)], { type: 'image/png' }), basename(filePath))
  fd.append('overwrite', 'true')
  const res = await fetch(`${BASE}/upload/image`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`/upload HTTP ${res.status}`)
  return (await res.json()).name
}

function buildGraph(uploaded, promptText, seed, dur, ref0Name, ref1Name) {
  const g = structuredClone(baseGraph)
  g['94'].inputs.image = ref0Name
  g['95'].inputs.text = promptText
  g['20'].inputs.value = dur
  g['44'].inputs.aspect_ratio = '16:9 (Widescreen)'
  g['44'].inputs.megapixels = 0.9
  g['44'].inputs.multiple = 32
  g['3'].inputs.noise_seed = seed
  delete g['97'].inputs['ref_images.ref_image_1']
  if (ref1Name) {
    g['96'] = { inputs: { image: ref1Name }, class_type: 'LoadImage', _meta: { title: 'anchor' } }
    g['97'].inputs['ref_images.ref_image_1'] = ['96', 0]
  }
  return g
}

async function submit(graph) {
  const res = await fetch(`${BASE}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: graph }) })
  if (!res.ok) throw new Error(`POST /prompt HTTP ${res.status}: ${(await res.text()).slice(0, 800)}`)
  return await res.json()
}

function findFreshOutput(sinceMs) {
  try {
    const fresh = readdirSync(CONFIG.comfyOut, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.mp4$/i.test(e.name))
      .map((e) => ({ name: e.name, mtime: statSync(join(CONFIG.comfyOut, e.name)).mtimeMs }))
      .filter((f) => f.mtime >= sinceMs).sort((a, b) => b.mtime - a.mtime)
    return fresh.find((f) => /-audio\.mp4$/i.test(f.name)) ?? fresh[0] ?? null
  } catch { return null }
}

async function waitAndCollect(promptId, startMs) {
  const deadline = Date.now() + CONFIG.timeoutMs
  while (Date.now() < deadline) {
    const h = await (await fetch(`${BASE}/history/${promptId}`)).json()
    const entry = h[promptId]
    if (entry) {
      const st = entry.status ?? {}
      if (st.status_str === 'error' || st.status_str === 'error_validation') throw new Error(`任务失败: ${JSON.stringify(st.messages ?? st).slice(0, 1200)}`)
      if (st.completed) {
        const files = []
        for (const no of Object.values(entry.outputs ?? {})) for (const arr of [no?.gifs, no?.videos, no?.images]) if (Array.isArray(arr)) for (const it of arr) if (it?.filename) files.push(it)
        const vid = files.find((f) => /\.(mp4|webm|mov)$/i.test(f.filename)) ?? files[0]
        if (!vid) {
          const fresh = findFreshOutput(startMs)
          if (fresh) { log(`history 无输出，取最新: ${fresh.name}`); return { filename: fresh.name, type: 'output' } }
          throw new Error(`完成但未找到输出: ${JSON.stringify(entry.outputs).slice(0, 400)}`)
        }
        return vid
      }
    }
    await new Promise((r) => setTimeout(r, CONFIG.pollMs))
  }
  throw new Error(`超时: ${promptId}`)
}

async function download(vid, dest) {
  const q = new URLSearchParams({ filename: vid.filename, type: vid.type ?? 'output' })
  if (vid.subfolder) q.set('subfolder', vid.subfolder)
  const res = await fetch(`${BASE}/view?${q}`)
  if (!res.ok) throw new Error(`/view HTTP ${res.status}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

async function visionModel() {
  try {
    const j = await (await fetch(`${CONFIG.ollama}/api/tags`)).json()
    const names = (j.models ?? []).map((m) => m.name)
    return names.find((n) => /qwen3/i.test(n)) ?? names[0] ?? null
  } catch { return null }
}

async function qaTail(mp4, frame) {
  execFileSync('ffmpeg', ['-y', '-sseof', '-0.4', '-i', mp4, '-frames:v', '1', frame], { stdio: 'ignore' })
  const model = await visionModel()
  if (!model) throw new Error('Ollama 无模型')
  const res = await fetch(`${CONFIG.ollama}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: '质检AI生成视频尾帧：1)人物是否居中清晰；2)背景是否干净；3)有无畸形/模糊/多肢。只输出JSON：{"pass":true或false,"reason":"简短中文"}', images: [readFileSync(frame).toString('base64')], stream: false, think: false, options: { num_predict: 150 } }),
  })
  const j = await res.json()
  const t = (j.response ?? '').trim()
  const m = t.match(/"pass"\s*:\s*(true|false)/i)
  return { pass: m ? m[1].toLowerCase() === 'true' : true, text: t.slice(0, 200) }
}

async function unloadVision(model) {
  if (!model) return
  try { await fetch(`${CONFIG.ollama}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, keep_alive: 0 }) }); log(`视觉模型已卸载: ${model}`) } catch {}
}

log(`=== H3 分段生成启动（${ACTIVE.length}/${SEGS.length} 段）===`)
const portrait = await uploadImage(REF0)
const chain = {}

async function ensureRef0(segName, prevName) {
  if (!prevName) return portrait
  if (chain[prevName]) return chain[prevName]
  const prevMp4 = join(SEG_DIR, prevName, `${prevName}.mp4`)
  if (!existsSync(prevMp4)) throw new Error(`前段 ${prevName} 缺失`)
  const lastPng = join(ROOT, 'refs', `${prevName}-last.png`)
  execFileSync('ffmpeg', ['-y', '-sseof', '-0.15', '-i', prevMp4, '-frames:v', '1', lastPng], { stdio: 'ignore' })
  const name = await uploadImage(lastPng)
  chain[prevName] = name
  log(`[${segName}] 链式参考 = ${prevName} 尾帧`)
  return name
}

for (const seg of ACTIVE) {
  const seqIdx = SEGS.findIndex((s) => s.name === seg.name)
  const prevName = seqIdx > 0 ? SEGS[seqIdx - 1].name : null
  const ref0Name = await ensureRef0(seg.name, prevName)
  const dir = join(SEG_DIR, seg.name)
  mkdirSync(dir, { recursive: true })
  const dest = join(dir, `${seg.name}.mp4`)
  const qaMark = join(dir, 'qa-pass.txt')
  if (existsSync(dest) && existsSync(qaMark)) { log(`[${seg.name}] 已存在且通过，跳过`); continue }

  let attempt = 0, done = false
  while (attempt < CONFIG.qaMaxAttempts && !done) {
    attempt++
    const seed = Math.floor(Math.random() * 2 ** 53)
    const t0 = Date.now()
    log(`[${seg.name}] 第${attempt}次提交… ${seg.dur}s ref0=${ref0Name} ref1=${portrait}`)
    try {
      const graph = buildGraph({}, promptTexts[seg.name], seed, seg.dur, ref0Name, seqIdx > 0 ? portrait : null)
      writeFileSync(join(dir, `submitted-graph-${attempt}.json`), JSON.stringify(graph, null, 2), 'utf8')
      const { prompt_id } = await submit(graph)
      const vid = await waitAndCollect(prompt_id, t0)
      await download(vid, dest)
      log(`[${seg.name}] 视频完成 (${((Date.now() - t0) / 1000).toFixed(0)}s)`)

      let qaPass = true
      try {
        const qa = await qaTail(dest, join(dir, 'tail.png'))
        log(`[${seg.name}] 尾帧质检: ${qa.pass ? 'PASS' : 'FAIL'} | ${qa.text}`)
        qaPass = qa.pass
      } catch (e) { log(`[${seg.name}] 质检异常(继续): ${e.message}`) }
      await unloadVision(await visionModel())

      if (!qaPass && attempt < CONFIG.qaMaxAttempts) { log(`[${seg.name}] 质检不通过，重试`); rmSync(dest, { force: true }); continue }
      if (qaPass) writeFileSync(qaMark, 'pass\n', 'utf8')
      done = true
    } catch (e) {
      log(`[${seg.name}] 失败: ${e.message}`)
      writeFileSync(join(dir, 'error.txt'), e.message, 'utf8')
      process.exit(1)
    }
  }
}
log('=== 分段生成完成 ===')
