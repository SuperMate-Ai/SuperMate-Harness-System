# `wecom-bridge.mjs` 改动说明（patch/apply-patch.ps1 自动完成）

本文件逐处说明对 `@xmanrui/dsh-im` 源码 `src/channels/wecom/wecom-bridge.mjs` 的修改。补丁只改这一文件 + 新增 `wecom-qwen-proxy.mjs`，其余代码零改动。

---

## 改动点 ①：新增 import

**位置**：文件头部，`image-prompt.mjs` 导入块之后。

```js
// 原：
} from '../shared/image-prompt.mjs';

// 改后：
} from '../shared/image-prompt.mjs';
import { qwenVisionContentForMessage } from './wecom-qwen-proxy.mjs';
```

**作用**：引入千问读图代理模块（`wecom-qwen-proxy.mjs`，随插件一起构建进 host bundle）。

---

## 改动点 ②：图片 content 构造改为"千问代理优先，模型图片回退"

**位置**：`#process(frame, …)` 方法内，`askInWorkspaceSession` 调用之前。

```js
// 原：
let content = hasImages
  ? await promptContentForMessage(message, { signal: this.#signal })
  : undefined;

// 改后：
let content;
if (hasImages) {
  if (process.env.DSH_WECOM_QWEN_VISION === '0') {
    content = await promptContentForMessage(message, { signal: this.#signal });
  } else {
    try {
      content = await qwenVisionContentForMessage(message, {
        signal: this.#signal,
        logger: this.#logger,
      });
    } catch (proxyError) {
      this.#logger.warn?.(
        '[dsh-im:wecom] qwen sidebar proxy failed; falling back to model images:',
        proxyError,
      );
      content = await promptContentForMessage(message, { signal: this.#signal });
    }
  }
}
```

### 为什么这样改

1. **原逻辑**：图片消息 → `promptContentForMessage()` 下载图片并构造 `[{type:'image',…}]` blocks → `session.ask(content)` 进入 Harness。
2. **问题**：Harness 对 image block 做模型能力预检——模型 `inputModalities` 不含 `image`（如 `deepseek-v4-flash`）时直接拒绝，错误映射为 `INPUT_INVALID` / "当前模型不支持图片"。
3. **补丁**：图片不再构造 image block，而是由 `qwenVisionContentForMessage()` 完成「下载 → 夸克千问侧栏分析 → 纯文本」。模型收到的永远是 `[{type:'text',…}]`，**预检不触发，模型感知不到图片**。
4. **回退**：千问代理抛错（夸克未开 / 千问页未开 / 超时 / 脚本异常）时，`catch` 回退到原 `promptContentForMessage()` —— 行为与未打补丁完全一致，不会比原来更差。
5. **开关**：`DSH_WECOM_QWEN_VISION=0` 可整体关闭代理（等价未打补丁）。

### 为什么不直接改模型元数据"假装支持图片"

假能力会让 image block 通过预检、进入模型请求，最终在 LLM API 层报错（模型实际不支持），是死路。正确做法是**图片根本不进模型请求**（本补丁）。

---

## 新增文件：`wecom-qwen-proxy.mjs`（见同目录）

| 导出 | 说明 |
|---|---|
| `qwenVisionContentForMessage(message, {signal, logger})` | 入站图片消息 → 文本 content blocks |
| 内部 `runQwenVision()` | spawn `node qwen-vision.js <图> <问题>`，解析 `[4/4] ===== 千问视觉回复 =====` 之后的正文，120s 超时 |
| 内部 `enqueue()` | 全局串行队列：千问对话页是共享单例，防止多会话并发打架 |

环境变量：`DSH_WECOM_QWEN_VISION`（`0` 关闭）、`DSH_WECOM_QWEN_VISION_SCRIPT`（脚本路径）、`DSH_WECOM_QWEN_TMP`（临时目录）。

---

## 回滚方法

```powershell
# 1) 移除 link 安装，回到 npm 版本
dsh plugin --profile web add -w @xmanrui/dsh-im
# 2) 或直接删除补丁副本目录后重装
Remove-Item <repo>\build\dsh-im-patched -Recurse -Force
dsh plugin --profile web add -w @xmanrui/dsh-im
# 3) 重启 dsh web
```

补丁仅存在于 link 副本（`build\dsh-im-patched`），删除即完全还原，不影响 npm 源包。
