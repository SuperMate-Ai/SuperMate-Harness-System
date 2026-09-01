/**
 * context-handoff-auto — 对齐 DSH compaction 的自动备份插件
 *
 * ═══════════════════════════════ 说明书 ═══════════════════════════════
 *
 * 【背景 · 从 compaction-basic 学习】
 *   DSH 内置 @deepseek-ai/dsh-compaction-basic，默认 auto=true：
 *     - 触发点：agent/pre-step（每次请求前压力检查）+ agent/request-error（溢出兜底）
 *     - thresholdRatio 默认 0.8：上下文压力 ≥80% 时自动压缩
 *     - retainRatio 默认 0.16：保留尾部 16% 原样，前面压成 LLM 摘要
 *     - 效果：同窗口"摘要续命"，防止满载中断；但中间细节会被摘要化丢失
 *   因此：本地 128k 模型（如 Qwen3.6-35B-IQ3_S）其实已被 DSH 原生保护，不会硬断。
 *
 * 【本插件的定位 · 不可替代的价值】
 *   compaction 管"续命不中断"，本插件管"完整备份不丢细节"：
 *   在 compaction（80%）触发之前，先把完整 session 与工作区状态备份到文件，
 *   即使之后被摘要化，全量信息也保留在备份目录。
 *
 * 【机制 · 阈值全部提前于 compaction】
 *   用量 ≥70%  → WARN（提醒精简，预告备份）
 *   用量 ≥75%  → BACKUP（完整备份，此时 compaction 尚未触发）
 *   用量 ≥80%  → 交给 DSH compaction-basic 接管（摘要续命），本插件不再重复
 *   轮数参考：128k 模型约 80 轮 ≈ 80% 压力；≥60 轮即开始关注
 *
 * 【触发方式】
 *   每轮开始由 agent 按注入规则运行 check_context.py 自查（方案 A：系统提示注入，
 *   简单可靠；后续可升级为 agent/pre-step 事件 + tokenMeter 的真·事件驱动，对齐
 *   compaction-basic 的触发架构）。
 *
 * 【BACKUP 动作 · 完整备份（非摘要）】
 *   1. 复制 $env:DSH_SESSION_JSONL → {DSH_HOME}/handoff-backups/{工作区}/{时间戳}/session.jsonl.zstd
 *   2. 同目录写《交接文档.md》（工作区速览/当前状态/待办/常用命令）
 *   3. 更新工作区 docs/任务交接-新对话引导.md 为最新状态
 *   4. 告知用户备份路径；如需保留更多细节可手动发"继续"触发交接（token 归零重算，
 *      旧记录仍可见不计入）
 *
 * 【作用范围】
 *   方案 A：全局注入系统提示；文本写明"仅 ≤131072 窗口模型执行；大窗口仅参考"。
 *   大窗口（262k+/1M）下 70-80% 阈值极少触发，无副作用。
 *
 * 【自定义】
 *   阈值：改 ruleText 中的 70%/75%/80%、60/80 轮。
 *   备份目录：改 backupRoot 路径约定。
 *   也可在 DSH 插件配置中给 qwen3.6 配 modelPolicies 单独调 compaction 阈值（可选）。
 *
 * 【依赖】
 *   运行时零外部依赖（仅类型导入）；依赖 context-handoff 技能的
 *   scripts/check_context.py（缺失时降级为轮数触发）。
 * ═══════════════════════════════════════════════════════════════════════
 */
import type { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'context-handoff-auto'

function dshHome(): string {
  return process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
}

export function apply(ctx: Context): void {
  const home = dshHome()
  const checkScript = join(home, 'skills', 'context-handoff', 'scripts', 'check_context.py')
  const backupRoot = join(home, 'handoff-backups')

  const ruleText = [
    '【自动备份 · 对齐 DSH compaction 机制】（context-handoff-auto 插件注入）',
    '背景：DSH 内置 compaction-basic（默认 auto=true）在上下文压力≥80% 时自动把旧内容压成摘要',
    '（保留尾部16%原样），防满载中断——但摘要化会丢失中间细节。',
    '本插件职责：在 compaction 之前先把完整状态备份到文件，保全量、不丢细节。',
    '',
    '适用：contextWindow ≤131072 的本地模型会话（如 Qwen3.6-35B-IQ3_S，settings.yaml contextWindow=131072）。',
    '大窗口（262k+/1M）模型会话：本条仅参考，不执行。',
    '',
    '触发阈值（全部提前于 compaction 的 80%）：',
    '1. 用量 ≥70% → WARN：提醒上下文将满，回答精简，预告即将自动备份',
    '2. 用量 ≥75% → BACKUP：立即执行完整备份（此时 compaction 尚未触发）',
    '3. 用量 ≥80% → 由 DSH compaction-basic 接管（摘要续命），本插件不再重复动作',
    '轮数参考：128k 模型约 80 轮≈80% 压力（用户实测）；轮数≥60 即开始关注。',
    '',
    '用量来源：每轮开始运行',
    `  python "${checkScript}" --window 131072`,
    '（读 $env:DSH_SESSION_JSONL 估算；若脚本缺失，按轮数触发：≥60 轮关注、≥80 轮备份）。',
    '',
    'BACKUP 动作（完整备份，非摘要）：',
    `a. 复制 $env:DSH_SESSION_JSONL 到 ${backupRoot}/{工作区名}/{YYYYMMDD-HHMMSS}/session.jsonl.zstd`,
    'b. 同目录写《交接文档.md》（工作区速览/当前状态/待办/常用命令）',
    'c. 更新工作区 docs/任务交接-新对话引导.md 为最新状态',
    'd. 告知用户：完整状态已备份到 <备份路径>；DSH 将在 80% 压力自动压缩续命，',
    '   如需保留更多细节可发送"继续"触发手动交接（token 归零重算，旧记录仍可见）',
    '',
    '禁止：新会话中不把旧 session 文件全文读入上下文；备份文档保持精简（≤几百 token）。',
  ].join('\n')

  // 使用官方 web-app 验证过的 ctx.inject 模式注入系统提示规则（更稳）
  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.section({
      name: 'policy:context-auto-handoff',
      order: 5,
      text: ruleText,
    })
  })
}
