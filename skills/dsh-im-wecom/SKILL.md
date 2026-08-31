# dsh-im-wecom — 企业微信 Bot × DeepSeek Harness 对话 Skill

> 让企业微信智能机器人与本机 DeepSeek Harness 对话。**零手写桥接代码**：接入由 `@xmanrui/dsh-im` 插件完成（官方 WebSocket 长连接、加密、流式回复全部内置）。
> **增强能力**：企微发图 → 自动转交**夸克千问侧栏**分析 → 只把分析文本交给 Harness 模型（纯文本模型也能"看图"，且模型感知不到图片存在）。

## 核心认知（最重要，先读）

- ❌ **错误做法**：手写 `wecom_bot.py` / 自己调企业微信 API 桥接——容易启动失败（exit code 1）、无流式、无会话管理、难维护。之前踩过的坑：进程起不来、文件写不进、连接不上。
- ✅ **正确做法**：安装 `@xmanrui/dsh-im` 插件（一个插件统一九种 IM 渠道），在 Web 界面「设置 → IM机器人」里扫码或填凭据。
- 🧠 **图片怎么办**：默认模型若是纯文本模型（如 `deepseek-v4-flash`），企微发图会被拒（"当前模型不支持图片"）。**不要**因此切模型——安装本 skill 附带的 `patch/` 补丁，图片会改走夸克千问侧栏（`quark-qwen-vision` skill 的 `qwen-vision.js`），模型只收到千问的分析文本。

## 功能特性

| 功能 | 说明 |
|---|---|
| 一键接入 | `dsh plugin --profile web add -w @xmanrui/dsh-im`，扫码或填 Bot ID + Secret |
| 官方长连接 | `@wecom/aibot-node-sdk` WebSocket 长连接，无公网 IP / 端口转发 |
| 流式交互 | 企微原生"正在思考中"、工具进度、逐步生成 |
| 图片/文件 | 图片 ≤5MB/张、≤20MB/条；文件可回传（需素材上传能力） |
| 🧠 千问侧栏读图代理 | 企微图片 → 夸克千问侧栏 CDP 分析 → 文本注入模型（见下） |
| 会话/工作区/模型 | `/new` `/session` `/workspace` `/model` `/preset` `/stop` `/steer` 等 |
| 多机器人 | 同一渠道多机器人独立管理 |
| 脱敏 | Secret 只入 DSH 凭据存储，配置存引用，RPC 不回传 |

## 安装与接入步骤

### 第 0 步：企业微信侧准备（获取 Bot ID + Secret）

1. 打开**企业微信客户端** → **工作台** → **智能机器人**（若无入口，可在企业微信管理后台「应用管理」中启用/创建"智能机器人"）
2. 创建并设置智能机器人，接入方式选择 **长连接**
3. 复制机器人的 **Bot ID** 与 **Secret**（Secret 等同密码，妥善保管）
4. 把 Bot ID + Secret 交给 Harness 配置（下一步）

```sh
# 1. 安装插件（web profile，推荐 npm 稳定版）
dsh plugin --profile web add -w @xmanrui/dsh-im
```

```sh
# 2. 重启 dsh web，刷新浏览器，打开「设置 → IM机器人」→ 左侧选「企业微信」
```

```sh
# 3. 绑定凭据：把第 0 步的 Bot ID + Secret 填入「手动绑定」（或扫码创建智能机器人）
# 4. 配置热生效（无需重启）：企业微信群里 @ 机器人，或在单聊中直接发消息
```

> 本仓库已含源码副本与补丁：`patch/` 目录（见 README 与 patch/README.md）。

## 千问侧栏读图代理（增强功能）

**为什么需要**：企微图片以 image block 进入 Harness 时，Host 会做模型能力预检；纯文本模型（deepseek-v4-flash 等）会拒绝（错误码 INPUT_INVALID / "当前模型不支持图片"）。

**补丁做了什么**：在 `wecom-bridge.mjs` 的图片处理处插入代理——图片不再构造 image block，而是：

```
企微图片 → SDK 下载(解密 aeskey) → 临时文件 → 夸克千问侧栏(CDP 粘贴+提问)
        → 千问分析文本 → [{type:'text'}] 纯文本进会话 → 模型正常回答
```

**效果**：模型请求中永远没有图片；预检永不触发；模型看到的是"一段图片分析文字"（等价于收到链接/描述而非图片）。千问页面为共享单例，代理已做全局串行队列。

**安装**（前置：夸克 9222 调试模式 + 千问对话页已开 + 有 `quark-qwen-vision` skill）：

```powershell
powershell -ExecutionPolicy Bypass -File patch\apply-patch.ps1
```

完成后**重启 dsh web**，再在企微发图测试。

**配置**（环境变量）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `DSH_WECOM_QWEN_VISION` | 未设=启用 | `0` 关闭代理 |
| `DSH_WECOM_QWEN_VISION_SCRIPT` | `$DSH_HOME/skills/quark-qwen-vision/scripts/qwen-vision.js` | 千问看图脚本 |
| `DSH_WECOM_QWEN_TMP` | 系统临时目录 | 图片临时目录 |

**排错**：发图仍报"不支持图片" = 代理 fallback 触发（夸克未开/千问页未开/脚本路径不对）。用 `node <qwen-vision.js> <图> "问题"` 单独验证。

## 使用方式

- **群聊**：@ 机器人 → DSH 智能体接管并处理任务（在你指定的工作区创建文件夹、查看文件、跑 skill）
- **单聊**：直接发消息即可
- **会话**：每条聊天默认绑定独立 Harness 会话；`/new` 开新会话，`/session` 绑定已有会话
- **工作区**：默认使用 Host 当时工作目录，可在机器人卡片改；也可发 `/workspace <绝对路径>` 切换

## 机器人命令速查

| 命令 | 作用 |
|---|---|
| `/help` | 显示机器人支持的命令和用法 |
| `/new` | 解除当前聊天会话绑定，下一条消息开启全新 Harness 会话 |
| `/status` | 检查当前机器人与 DSH 的连接状态（排查首选） |
| `/version` | 查看当前 dsh-im 插件版本 |
| `/models` → `/model <序号或 Provider/模型ID> [推理等级]` | 列出并切换模型 |
| `/reasoninglist` → `/reasoning <序号>` | 列出并切换推理等级（`--default` 恢复默认） |
| `/presetlist` → `/preset <序号或ID>` | 查看/设置 Agent Preset（`--default` 跟随 Host 默认） |
| `/stop` | 停止当前聊天正在运行的任务（保留排队消息） |
| `/steer <补充指令>` | 向正在运行的任务追加指令 |
| `/batch` → `/send` / `/cancel` | 私聊批量收集 ≤10 条消息一次提交 |
| `/compact` | 压缩当前会话较早上下文 |
| `/workspace <绝对路径>` / `/workspacelist` | 切换/列出 Harness 工作区 |
| `/sessionlist` / `/session <ID>` / `/history [N]` | 会话列表 / 绑定 / 看历史（默认3条最多5条） |
| 远程审批 | 回复 `批准`/`拒绝`/`同意`/`yes`/`no` 处理 Harness 审批 |

## 故障排查

| 现象 | 处理 |
|---|---|
| 机器人没反应 / 手机端发消息无响应 | ① 发 `/status` 查连接；② 确认插件已安装且 dsh web 已重启；③ 看插件版本 `/version` |
| 之前手写的 wecom_bot.py 起不来 | 删掉/停用桥接脚本，改走 dsh-im 插件（见核心认知） |
| 发图报"当前模型不支持图片" | 千问代理 fallback 触发：检查夸克 9222、千问对话页、`qwen-vision.js` 单独可跑 |
| 图片没挂上千问 | 确认格式 png/jpg/webp/gif、单张 ≤5MB、单条 ≤20MB；大图先压缩 |
| 改了 Agent Preset / 模型后不生效 | 若当前聊天已有会话：先发 `/new` 再发普通消息；切换只影响新会话 |
| 文件回传失败 | 确认企业微信应用具备素材上传和文件消息能力 |
| 更新插件后仍显示"待手动重启" | 手动重启 dsh web，点「刷新状态」；重装插件后需重打补丁 |

## 关联

- 插件源码/文档：`@xmanrui/dsh-im`（npm / GitHub xmanrui/dsh-im），Node ≥ 22.19
- 视觉通道：`quark-qwen-vision`（夸克内置千问，CDP 网页操作，零 API Key）
- 本仓库：`SuperMate-Ai/dsh-im-wecom`（README.md 完整文档 / FEATURES.md 功能明细 / patch/ 补丁包）
