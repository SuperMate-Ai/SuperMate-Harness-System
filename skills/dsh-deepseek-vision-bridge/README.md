# dsh-deepseek-vision-bridge

**DeepSeek Harness GUI 直接收图** —— 让纯文本 DeepSeek 模型（deepseek-v4-flash 等）
在对话框贴图后不再报"当前模型不支持图片"，图片自动经**夸克千问侧栏**识图转成
中文描述注入上下文。

> 🧠 **架构级突破**：DeepSeek 权重无视觉编码器（纯文本物理限制），本桥在 **DSH
> 原生 `llm-deepseek` adapter 层**把视觉通道变成模型请求管线里的自动环节——模型
> 收到纯文本却完整"看懂"图片。GUI / IM / 任何走 DeepSeek 的图片统一生效。

> 🌍 **通用性（非 SuperMate 私有）**：本机制是对 **DSH 上游的通用增强补丁**——
> 只改官方包 `@deepseek-ai/dsh-llm-deepseek`，依赖全为 `@deepseek-ai/*` + Node
> 内置 + 通用夸克 CDP，零私有依赖、零机器特定路径。任何官方 DSH 用户 clone 上游
> 后覆盖 `patch/` 即可获得；本仓库仅是托管发布点（可回馈上游/独立分发）。

> 👁️ **双 agent 协作 vs mmproj**：本地多模态靠 mmproj 做权重内静态对齐（本地小
> 眼睛、不可追问）；本桥让文本 agent（DeepSeek）自动调用**夸克云端满血千问**做
> 运行时转译——满血视觉远超本地 9B/35B，且**可对话式追问、可替换、可迭代**。

- **原生层 · 全局生效**：改 DSH 自己的 `llm-deepseek` 适配器（`patch/` 提供改动后源文件与说明），非逐通道桥接
- **零显存零 token**：识图走夸克 CDP（侧栏），不占本地 GPU、不需 API key
- **图不丢**：原图入 durable/attachment，仅模型收到的副本是文本
- **自动重试**：识图失败降级占位且不缓存，下轮自动补转；成功才缓存（同图秒回）
- **多图串行**：逐图转译 + 1.5s 冷却，千问侧栏不卡顿
- **零回归**：无附件 seam 组合保持原生 text-only；158 测试全绿

## 文件结构

```
dsh-deepseek-vision-bridge/
├── SKILL.md          # 技能说明（核心认知/原理/验证/回滚）
├── README.md         # 本文件
├── patch/            # DSH 原生改动（覆盖或按 bridge-change.md 手改）
│   ├── adapter.ts            # stream() 序列化前转译 + 能力动态声明
│   ├── index.ts              # apply() 组装 translateContent hook
│   ├── vision-translate.ts   # 转译核心（串行/缓存/cleanDescription）
│   ├── vision-debug.ts       # （可选）写文件调试日志
│   ├── vision-translate.spec.ts  # 单测（7 用例）
│   └── bridge-change.md      # 逐处改动说明 + 回滚
└── scripts/          # 识图辅助（自包含，含 cdp.js）
    ├── qwen-vision-anchor.js # 唯一标记定位的干净识图脚本
    └── cdp.js                # CDP 简易客户端（Node≥22 零依赖）
```

## 快速接入

前置：夸克调试模式（9222）+ 千问对话页打开 + DSH 环境。

```powershell
# 1. patch/ 覆盖到 DSH checkout 对应路径（见 patch/bridge-change.md）
# 2. scripts/ 复制到本机（或指向已有 quark-qwen-vision skill）
# 3. 重建 + 重启
cd E:\deepseek-harness-v013
pnpm exec tsc -b packages/llm/llm-deepseek
pnpm exec tsdown --env.DSH_BUILD_FACE host
# 重启 dsh web → GUI 贴图发送，DeepSeek 即能"看图"
```

环境变量见 `SKILL.md`（`DSH_VISION_QWEN_SCRIPT` / `_TIMEOUT_MS` / `_COMMAND`）。

## 关联

- 依赖概念与 `dsh-im-wecom` 的"千问读图代理"一致，但实现层级在原生 adapter，
  对 GUI/IM 等所有 DeepSeek 图片输入统一生效。
- 识图通道复用 `quark-qwen-vision` skill 的 CDP 机制（零 API key）。
