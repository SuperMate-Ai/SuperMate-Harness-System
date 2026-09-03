# dsh-deepseek-vision-bridge — DeepSeek 原生看图桥（Harness GUI 直接收图）

> 🚀 **DSH 架构级突破（2026-09-03 实测验证）**：让**纯文本 DeepSeek 模型**拥有
> 了**原生读图能力**——不是 prompt 技巧，而是把视觉通道（夸克千问侧栏）从"人工
> 手动调用"升级为**模型请求管线里的自动环节**。

> **突破的本质**："看图"是能力，不是模型属性。DeepSeek 权重里没有视觉编码器（纯
> 文本，`inputModalities:['text']`），这是物理限制；但 harness 层可以绕过它——
> 图片在**适配器序列化前**自动经千问侧栏转成结构化中文描述，模型收到的是纯文本，
> 却完整理解画面。模型自己感知不到图的存在，如同"开天眼"。

> 让**纯文本 DeepSeek 模型**在 DeepSeek Harness GUI 对话框直接接收图片——不再弹
> "当前模型不支持图片，请切换支持图片的模型"。图片自动经**夸克千问侧栏**（CDP，
> 零本地显存 / 零 API key）转成结构化中文描述注入上下文，主脑"感觉不到图存在"，
> 却能完整理解画面。

> **实现层级**：直接改造 DSH 原生 `llm-deepseek` 适配器（非外围桥接），因此
> **GUI 贴图、IM 贴图、任何走 DeepSeek 会话的图片**都统一生效。

---

## 为什么这是重大突破（先读）

| 维度 | 说明 |
|---|---|
| **原生层 · 全局生效** | 补丁在 DSH 自己的 `llm-deepseek` adapter，任何走 DeepSeek 的图片（GUI / IM / 其它）**统一**自动转译——无需逐通道维护桥接 |
| **图永不丢失** | 原图字节在 durable attachment store（GUI 历史可见、可复用）；只把"发给模型的副本"图→文 |
| **零显存 · 零 token** | 识图走已开的夸克浏览器 CDP；16GB 显卡留给 ComfyUI H3 采样，不与 Ollama 抢显存 |
| **工程级健壮** | 严格串行 + 每图 1.5s 冷却（侧栏是网页会话，突发并发会卡）· **只缓存成功**（同图秒回，失败不污染）· 失败降级占位 + **下轮自动重试** · 无附件 seam 组合保持原生 text-only（零回归，158 测试全绿） |
| **诚实的边界** | 首图 ~10s 在模型请求内；缓存进程级（重启需重转一次）；侧栏是会话，极端多图突发仍有上限 |

---

## 核心认知（先读）

- **问题**：Harness GUI 贴图后，Host 按模型的 `inputModalities` 做能力预检。
  纯文本模型（`deepseek-v4-flash` 等，声明 `['text']`）直接拒绝，弹"当前模型不支持图片"，
  且图片不会进入会话。
- **根因**：`llm-deepseek` 适配器序列化器对 image block 做 `assertTextOnly` 硬拒
  （防静默丢图），`llm-deepseek` 能力声明为 `['text']`。
- **本桥做法**：让 adapter **声明支持 image 输入**（因为它在序列化前会把图转成文本），
  从而 Host 预检放行、图片进入 durable（GUI 历史可见原图）；随后 adapter 在每次
  模型请求前扫描历史中的 image block → 调**夸克千问侧栏**识图 → 文本描述替换
  image block → 再序列化发送。模型收到的永远是纯文本，`assertTextOnly` 自然通过。

```
GUI 贴图 → Host 预检放行（模型声明含 image）→ 图存 durable + attachment
        → agent 组装请求 → llm-deepseek adapter.stream()
        → translateContent：逐图调 qwen-vision-anchor.js（夸克千问侧栏 CDP）
        → 结构化描述替换 image block → 序列化（assertTextOnly 不触发）
        → DeepSeek 正常回复，已"看懂"图片
```

## 为什么不用本地 Ollama 识图

本机若为 **16GB 显存**（如 RTX 5080），Ollama 加载视觉模型会与 ComfyUI H3 采样等
**抢显存**。本桥默认走夸克千问侧栏（CDP 控制已开的浏览器），零显存零 token。
纯文本模型权重层面无解（无视觉编码器），体验由 harness 层"图→文"转译实现。

## 改动文件（对 DSH 原生源码，见 patch/）

| 文件（E:\deepseek-harness\packages\llm\llm-deepseek\src\） | 改动 |
|---|---|
| `vision-translate.ts` | **新增**：`QuarkQwenChannel`（子进程调 `qwen-vision-anchor.js`）+ `translateMessages` / `translateContentBlocks`（严格串行 + 图间冷却）+ `cleanDescription`（去回声/建议句）+ 按 attachmentId 缓存（仅缓存成功） |
| `adapter.ts` | `DeepSeekAdapterOptions` 增可选 `translateContent` / `resolveImageSupported`；`stream()` 序列化前调用转译；`inputModalities` 按懒判定动态声明（无附件 seam 时保持原生 text-only） |
| `index.ts` | `apply()` 组装 hook：`ctx.get('attachments')` 惰性读 + `QuarkQwenChannel` |

配套脚本（quark-qwen-vision skill 目录）：`qwen-vision-anchor.js`（唯一标记定位，
干净识图输出）。

## 已实测验证

- 单图 → 千问侧栏 → 干净中文描述（~6-12s，缓存后毫秒级）
- 多图串行 + 每图 1.5s 冷却，千问不卡顿
- 转译失败降级为占位文本（不缓存），下轮自动重试，绝不阻塞会话
- 无附件 seam 的环境保持原生 text-only 行为（零回归）
- 单元测试 158 全过（含 vision-translate 7 用例）

## 安装与接入

**前置**：夸克浏览器调试模式（`--remote-debugging-port=9222`）+ 千问对话页已打开。
识图脚本自包含于本 skill `scripts/`（`qwen-vision-anchor.js` + `cdp.js`）；若本机已有
`quark-qwen-vision` skill（`$DSH_HOME/skills/quark-qwen-vision/scripts/`），默认路径也会
自动找到它。

```powershell
# 1. 把 patch/ 里的源文件覆盖到 DSH checkout
#    vision-translate.ts / adapter.ts / index.ts → packages/llm/llm-deepseek/src/
#    vision-translate.spec.ts                    → packages/llm/llm-deepseek/tests/（可选）
# 2. 重建 lib
cd E:\deepseek-harness
pnpm exec tsc -b packages/llm/llm-deepseek
pnpm exec tsdown --env.DSH_BUILD_FACE host
# 3. 重启 dsh web（改动 DSH 原生源码必须重启进程生效）
```

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `DSH_VISION_QWEN_SCRIPT` | `$DSH_HOME\skills\quark-qwen-vision\scripts\qwen-vision-anchor.js`（找不到可 env 指定本 skill scripts 路径） | 千问识图脚本路径 |
| `DSH_VISION_QWEN_TIMEOUT_MS` | `25000` | 单图识图硬超时（实测 ~6-12s） |
| `DSH_VISION_QWEN_COMMAND` | `node` | 运行脚本的可执行文件 |

## 验证

```powershell
# 单测
pnpm exec vitest run packages/llm/llm-deepseek/tests/vision-translate.spec.ts
# 手动链路（不经 GUI）
node <quark-qwen-vision>/scripts/qwen-vision-anchor.js <图片> "这张图是什么？"
# GUI：贴图发送 → DeepSeek 应能回答图片内容（首图等待 ~10s，同图秒回）
```

## 安全

- 转译代码不含任何密钥；图片字节经 DSH attachment 存储（content-addressed）
- 临时目录（`os.tmpdir()/dsh-vision-*`）用后自删
- 转译失败只降级文本，绝不丢图（原图仍在 attachment store）

## 回滚

DSH 改动前**非 git 仓库**，务必先备份：本次参考备份根
`E:\Harness Workspace\.dsh\backups\dsh-native-20260903-075551\`（含改动前源码）。
恢复 = 用备份覆盖 `adapter.ts` / `index.ts`，删除新增的 `vision-translate.ts` 后重建。
