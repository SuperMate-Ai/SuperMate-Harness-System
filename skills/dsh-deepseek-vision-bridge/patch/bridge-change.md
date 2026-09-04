# llm-deepseek 改动说明（patch/ 覆盖或手工应用）

本补丁改造 DSH 原生 `packages/llm/llm-deepseek`，让纯文本 DeepSeek 模型能接收
图片并在请求前自动转成文本。改动集中在 3 个文件，另新增 1 个调试模块与测试。

---

## 文件清单

| 文件 | 作用 |
|---|---|
| `vision-translate.ts` | **新增**。转译核心：`QuarkQwenChannel`（spawn `qwen-vision-anchor.js`）+ `translateMessages`/`translateContentBlocks`（**严格串行** + 每图 1.5s 冷却，防千问侧栏卡顿）+ `cleanDescription`（去问题回声/尾部建议句）+ 按 `attachmentId` 缓存（**仅缓存成功**，失败下轮自动重试） |
| `adapter.ts` | 修改。`DeepSeekAdapterOptions` 增 `translateContent?` 与 `resolveImageSupported?`；`stream()` 在序列化前 `await translateContent(messages)`；`modelInputModalities()` 按懒回调判定（含 image ⇔ 有附件 seam） |
| `index.ts` | 修改。`apply()` 组装 hook：惰性 `ctx.get('attachments')` + `QuarkQwenChannel`；`visionCache` 进程级缓存 |
| `vision-debug.ts` | **新增（可选）**。写文件调试日志（`$DSH_HOME/vision-bridge-debug.log`），排查用，可删除 |
| `vision-translate.spec.ts` | **新增（可选）**。7 用例单测 |

---

## 逐处改动说明

### ① adapter.ts — 能力声明与序列化前转译

**改动 A：构造函数选项**
```ts
// 原：DeepSeekAdapterOptions 只有 options/resolveApiKey/resolveUserId
// 改后新增两个可选字段：
translateContent?: (messages: Message[]) => Promise<Message[]>   // 图→文 hook
resolveImageSupported?: () => boolean                            // 懒能力判定
```

**改动 B：`modelInputModalities()`（能力声明核心）**
```ts
// 原：恒返回 ['text']
// 改后：
private modelInputModalities(): readonly ('text' | 'image')[] {
  return this.config.translateContent !== undefined
    && (this.config.resolveImageSupported?.() ?? true)
    ? ['text', 'image']
    : ['text']
}
```
作用：仅当部署组合了附件 seam（`ctx.get('attachments')` 有值）才声明含 image。
无附件 seam 的环境保持原生 `['text']` —— 既有行为零回归（这也保证既有单测通过）。

**改动 C：`stream()` 序列化前转译**
```ts
// 原：直接 const consumer = new AbortController()
// 改后：
const effectiveOptions = this.config.translateContent === undefined
  ? options
  : { ...options, messages: await this.config.translateContent(options.messages) }
const consumer = new AbortController()
```
位置在 `request()` 之前、watchdog 之外：转译的慢/快都不干扰传输层的 idle 记账。

### ② index.ts — hook 组装

```ts
// apply() 内新增：
const visionCache = new Map<string, string>()
let translator: VisionTranslator | undefined
try { translator = new QuarkQwenChannel() } catch { translator = undefined }
const resolveImageSupported = (): boolean => ctx.get('attachments') !== undefined
const translateContent = (messages) => { /* 惰性读 attachments + 逐图转译 */ }
const adapter = new DeepSeekAdapter({ options, resolveApiKey, resolveUserId, translateContent, resolveImageSupported })
```
要点：`ctx.get('attachments')` 必须**惰性**（每次调用时取）——attachment-local 可能
在 llm-deepseek apply 之后才挂载，同步读取会拿不到。

### ③ vision-translate.ts — 转译核心设计

- **串行**：千问侧栏是网页会话式，并发 paste 会互相干扰/卡顿 → 每张图等前一张
  完成后 + 1.5s 冷却再下一张。
- **缓存**：成功才 `cache.set`；失败返回占位文本但不缓存 → 下轮自动重试，不污染。
- **cleanDescription**：去问题回声（千问会回显问题）+ 去尾部"需要我帮你…吗"建议句。

---

## 为什么这样改

1. **原生路径统一生效**：改 adapter 而非外围桥接 → GUI 贴图、任何走 DeepSeek 的
   图片都自动转译，dsh-im-wecom 那类 IM 通道也受益。
2. **图不丢**：图片进 durable（GUI 历史可见），仅"喂给模型的副本"图→文。
3. **无附件 seam 零回归**：能力声明与 hook 都条件化，裸组合保持 text-only。

---

## 回滚

DSH checkout **非 git 仓库**，改动前务必整树备份。回滚三步：

```powershell
# 1. 用备份覆盖 adapter.ts / index.ts
# 2. 删除 vision-translate.ts / vision-debug.ts
# 3. 重建
cd E:\deepseek-harness-v013
pnpm exec tsc -b packages/llm/llm-deepseek
pnpm exec tsdown --env.DSH_BUILD_FACE host
# 4. 重启 dsh web
```
