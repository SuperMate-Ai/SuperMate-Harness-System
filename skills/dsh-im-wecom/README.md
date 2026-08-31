# dsh-im-wecom — 企业微信智能机器人 × DeepSeek Harness 接入 Skill

> 让**企业微信智能机器人**与**本机 DeepSeek Harness** 直接对话：官方 WebSocket 长连接、原生流式回复、图片/文件收发、会话与工作区管理。
> 核心增强：**图片自动转交夸克千问侧栏分析**——即使 Harness 用的是纯文本模型（如 deepseek-v4-flash），也能"看图"回答，且模型完全感知不到图片（只收到千问的分析文本）。

---

## 功能特性

| 功能 | 说明 |
|---|---|
| **一键接入** | 安装 `@xmanrui/dsh-im` 插件（一个插件统一 9 种 IM 渠道），Web 界面扫码或填 Bot ID + Secret |
| **官方长连接** | 基于企业微信智能机器人官方 SDK `@wecom/aibot-node-sdk` 的 WebSocket 长连接，无需公网 IP / 端口转发 / Webhook |
| **原生流式回复** | 企微端原生显示"正在思考中"、工具执行进度、逐步生成的回答 |
| **图片 / 文件收发** | 支持 JPEG/PNG/WebP/GIF 图片（单张 ≤5MB，单条 ≤20MB）；Harness 生成的文件作为企微原生附件回传 |
| **🧠 千问侧栏读图代理（本仓库核心增强）** | 企微发图 → 插件下载图片 → **夸克浏览器千问侧栏**（CDP）分析 → 只把分析文本交给 Harness 模型。**纯文本模型也能看图，且模型请求中不出现任何图片** |
| **会话管理** | 每个聊天独立 Harness 会话；`/new` 开新会话、`/session` 绑定已有、`/history` 看历史 |
| **工作区 / 模型 / Preset 控制** | `/workspace` 切换工作区、`/model` 切模型、`/preset` 选 Agent Preset、`/stop` `/steer` 控制任务 |
| **多机器人** | 同一渠道可接入多个机器人，凭据 / 工作区 / 会话彼此独立 |
| **安全脱敏** | Bot Secret 只写入 DSH 受保护凭据存储（`$DSH_HOME/.credentials.yaml`），配置文件仅存引用；RPC 接口不回传 Secret |
| **失败自动回退** | 千问侧栏不可用时自动回退原插件逻辑，不影响文字/文件功能 |

---

## 架构

```
┌────────────┐   官方 WebSocket 长连接   ┌──────────────────────────────┐
│ 企业微信    │ ◄──────────────────────► │  @xmanrui/dsh-im 插件 (DSH)    │
│ 智能机器人  │   (SDK: aibot-node-sdk)  │  wecom-bridge.mjs              │
└────────────┘                           └──────────────┬───────────────┘
                                                        │ 图片消息
                                                        ▼
                                   ┌──────────────────────────────────────┐
                                   │  wecom-qwen-proxy.mjs（本仓库补丁）    │
                                   │  ① 下载图片(解密 aeskey)               │
                                   │  ② 夸克千问侧栏 CDP 粘贴图片+提问       │
                                   │  ③ 只返回「分析文本」                   │
                                   └──────────────────┬───────────────────┘
                                                      │ 纯文本 blocks
                                                      ▼
                                   ┌──────────────────────────────────────┐
                                   │  Harness 会话（模型永远是文本输入）      │
                                   │  deepseek-v4-flash 等纯文本模型即可     │
                                   └──────────────────────────────────────┘
```

**关键设计**：图片字节只存在于「企微插件 ↔ 夸克千问侧栏」之间，**从不进入模型请求**。模型视角下只是一段"图片分析文字"——因此模型能力预检（"当前模型不支持图片"）永远不会触发。

---

## 快速开始（接入）

### 第 0 步：企业微信侧准备（获取 Bot ID + Secret）

1. 打开**企业微信客户端** → **工作台** → **智能机器人**（若无入口，可在企业微信管理后台「应用管理」中启用/创建"智能机器人"）
2. 创建并设置你的智能机器人，接入方式选择 **长连接**
3. 创建完成后复制机器人的 **Bot ID** 与 **Secret**（Secret 请妥善保管，等同密码）
4. 把 Bot ID + Secret 交给 Harness 侧配置（见下一步）

```sh
# 1. 安装 IM 插件（web profile）
dsh plugin --profile web add -w @xmanrui/dsh-im

# 2. 重启 dsh web，刷新浏览器 →「设置 → IM机器人」→ 左侧选「企业微信」

# 3. 绑定凭据：把上一步拿到的 Bot ID + Secret 填入「手动绑定」（或扫码创建智能机器人）
#    配置热生效：在企业微信群 @ 机器人，或单聊直接发消息
```

> 要求：Node ≥ 22.19；企业微信"智能机器人"（应用市场/后台开通，非旧版应用回调）。

---

## 千问侧栏读图代理（增强功能安装）

适用场景：默认模型是纯文本模型时，企微发图会被拒（"当前模型不支持图片"）。
本补丁让图片改走**夸克千问侧栏**，模型只收到分析文本。

### 前置条件
- 夸克浏览器以调试模式运行（`--remote-debugging-port=9222`）
- 千问对话页已打开（`https://p.quark.cn/pcquark-chat/sidebar`）
- 本机已有 `quark-qwen-vision` skill 的 `qwen-vision.js`（默认路径 `$DSH_HOME/skills/quark-qwen-vision/scripts/qwen-vision.js`，可用环境变量 `DSH_WECOM_QWEN_VISION_SCRIPT` 覆盖）

### 一键打补丁
```powershell
powershell -ExecutionPolicy Bypass -File patch\apply-patch.ps1
```
脚本自动完成：复制插件源码副本 → 打入图片代理 → 重新构建 → `link:` 安装到 profile → 提示重启。

### 重启后验证
1. 刷新 Web 界面，确认「IM机器人」企业微信仍显示已连接
2. 在企业微信发一张图（可附文字问题）→ 机器人显示"正在思考中" → 返回千问侧栏的分析结果

### 配置项（环境变量）

| 变量 | 默认 | 说明 |
|---|---|---|
| `DSH_WECOM_QWEN_VISION` | 未设（启用） | `0` 关闭代理，回退原插件图片逻辑 |
| `DSH_WECOM_QWEN_VISION_SCRIPT` | `$DSH_HOME/skills/quark-qwen-vision/scripts/qwen-vision.js` | 千问看图脚本路径 |
| `DSH_WECOM_QWEN_TMP` | 系统临时目录 | 图片临时存放目录 |

---

## 机器人命令速查

| 命令 | 作用 |
|---|---|
| `/help` | 显示机器人支持的命令 |
| `/new` | 开启全新 Harness 会话 |
| `/status` | 检查与 DSH 的连接状态（排查首选） |
| `/version` | 查看 dsh-im 插件版本 |
| `/models` → `/model <序号或ID> [推理等级]` | 列出 / 切换模型 |
| `/reasoninglist` → `/reasoning <序号>` | 列出 / 切换推理等级 |
| `/presetlist` → `/preset <序号或ID>` | 查看 / 设置 Agent Preset |
| `/workspace <绝对路径>` / `/workspacelist` | 切换 / 列出工作区 |
| `/sessionlist` / `/session <ID>` / `/history [N]` | 会话列表 / 绑定 / 历史 |
| `/stop` / `/steer <指令>` | 停止任务 / 追加指令 |
| `/batch` → `/send` / `/cancel` | 私聊批量输入 |
| 远程审批 | 回复 `批准`/`拒绝`/`同意`/`yes`/`no` |

---

## 目录结构

```
dsh-im-wecom/
├── README.md                  # 本文件：项目总览、功能特性、架构、快速开始
├── SKILL.md                   # DSH Skill 指令：加载后 agent 按此操作（含功能说明）
├── FEATURES.md                # 功能明细文档：每个能力的原理 / 配置 / 场景
├── CHANGELOG.md               # 更新日志与 Roadmap（本项目持续更新）
├── LICENSE                    # MIT
├── .gitignore
└── patch/                     # 千问侧栏读图代理补丁包
    ├── README.md              # 补丁包说明：每个文件的用途与安装步骤
    ├── wecom-qwen-proxy.mjs   # 代理模块（新增文件，随插件源码一起构建）
    ├── apply-patch.ps1        # 一键打补丁 + 重建 + link 安装
    └── bridge-change.md       # wecom-bridge.mjs 两处改动的精确说明与回滚方法
```

---

## 故障排查

| 现象 | 处理 |
|---|---|
| 机器人没反应 | 发 `/status`；确认插件已装、dsh web 已重启 |
| 发图仍报"当前模型不支持图片" | 千问代理 fallback 触发了：检查夸克 9222 是否在监听、千问对话页是否打开、`qwen-vision.js` 能否单独跑通 |
| 图片没挂上千问 | 确认格式 png/jpg/webp、单张 ≤5MB；大图先压缩到 1080px 内 |
| 改了模型/Preset 不生效 | 若聊天已有会话：先 `/new` 再发普通消息 |
| 文件回传失败 | 确认企微应用具备素材上传与文件消息能力 |
| 插件升级后代理消失 | 重新执行 `patch\apply-patch.ps1`（link 安装的补丁副本不受 npm 升级影响，但重装插件需重打） |

---

## 关联与致谢

- 上游插件：[xmanrui/dsh-im](https://github.com/xmanrui/dsh-im)（npm `@xmanrui/dsh-im`，v4.1.0）
- 官方 SDK：`@wecom/aibot-node-sdk`（企业微信智能机器人 WebSocket 长连接）
- 视觉通道：[quark-qwen-vision](https://github.com/)（夸克内置千问，CDP 网页操作，零 API Key）
- DSH：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 已装配进 **SuperMate Harness System**（本机插件编排体：能力矩阵 / 调用协议 / 关联技能）

MIT License
