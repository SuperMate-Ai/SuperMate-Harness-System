<div align="center">

# <img src="assets/quark-harness.png" width="42" height="42" align="middle" style="vertical-align: middle;" alt="SuperMate Harness" /> SuperMate Harness System

**"一切皆插件"** —— 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件结构组装而成的自包含真智能体系统。**下载一次，自带官方 deepseek-ai 的 skill/插件 + SuperMate 原创 skill/插件**，无需额外拉取。

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)
[![MiniMax H3](https://img.shields.io/badge/topic-minimax--h3-8b5cf6)](https://github.com/topics/minimax-h3)
[![Vision](https://img.shields.io/badge/vision-deepseek--eyes-6f42c1)](skills/Deepseek-eyes/)
[![Zero API Key](https://img.shields.io/badge/zero--api--key-CDP%20web%20automation-28a745)](skills/quark-qwen-vision/)

**天人合一** —— 云端灵感 · 本地可控 · 本地/云端工具统一应用

**English**：[README.md](README.md)

</div>

---

## ✨ 核心亮点

| | |
|---|---|
| 🚀 **一键入口** | 一个图标启动 Harness + 夸克 + 千问悬浮侧边栏 |
| 🧠 **AI 大脑** | DeepSeek（云端）+ 本地大模型——推理、规划、生成 |
| 👁️ **眼睛** | 视觉技能——Ollama 本地、夸克浏览器千问、或任意 OpenAI 兼容视觉 API |
| 🎬 **演播室** | 视频生产——豆包 Seedance 2.0、RunningHub MiniMax H3，全网页自动化驱动 |
| 🧩 **一切皆插件** | Skill（教"怎么做"）+ Plugin（提供"能做什么"），自由组装、替换 |
| 🔥 **零 API Key 矩阵** | DeepSeek 主脑 + 千问视觉/生图 + 豆包视频 + H3 云端视频——全部 CDP 网页自动化，无需 Ollama、无需 API Key、无需 GPU |

---

## 📦 仓库结构

```
SuperMate Harness System
 ├── skills/                        → Skill 层（任务级：教"怎么做"）
 │    ├── Supermate-harness-launcher/ 🚀 一键启动：Harness + 夸克 + 千问悬浮侧边栏
 │    ├── quark-qwen-vision/         🖼️ 夸克浏览器视觉+生图（零 API Key）
 │    ├── Deepseek-eyes/             👁️ 视觉 skill（Ollama / 视觉 API）
 │    ├── doubao-creator/            🎬 豆包文生视频（Seedance 2.0，零 API Key）
 │    ├── dsh-im-wecom/              💬 企业微信机器人 × DSH（@xmanrui/dsh-im + 千问读图代理）
 │    ├── rh-workflow/               🎥 RunningHub 云端 H3 工作流 API
 │    ├── rh-workflow-9b/            📋 9B RH 执行宪章
 │    ├── video-production-studio/   🎥 通用视频制作流水线（五文档+确认闸门+H3 原生提示词+本地通道）
 │    ├── lyric-mv-storyboard/       🎵 歌词驱动 MV 分镜（LRC 时间轴/三层表演/防变脸/一句一片段）
 │    ├── MiniMax h3-video-producer/ 🎞️ H3 视频生产全流程
 │    ├── Supermate/                 🤖 SuperMate 智能体身份
 │    └── DSH Official/             官方 deepseek-ai 技能（13 个 · fork 拷贝）
 └── plugins/                        → 插件层（系统级：能"做什么"）
      ├── Supermate/                自研插件（skill-json-importer 已开源；核心增强=闭源商业层）
      └── DSH Official/             官方 deepseek-ai 插件（49 族 · fork 拷贝）
```

---

## ⚡ 快速开始

**一键环境** —— Harness + 夸克 + 千问悬浮侧边栏：

```powershell
# 1. 把启动器技能拷入 DSH 技能目录
Copy-Item skills\Supermate-harness-launcher\ ~\.dsh\skills\ -Recurse

# 2. 编辑 config.ps1 —— 配置 Harness 启动命令 / 夸克路径
#    $HarnessStartCmd = 'E:\deepseek-harness\start-web.cmd'   （留空=手动启动 Harness）

# 3. 运行——Harness 启动、夸克打开、千问悬浮侧边栏弹出
powershell -ExecutionPolicy Bypass -File scripts\launch.ps1
```

> 其他技能同理：把文件夹拷进 `~/.dsh/skills/`，重启 DSH 会话即可。

---

## 🧩 原创技能

> **基于夸克浏览器** —— 夸克自带**千问侧边栏** + **夸克网盘**，是 SuperMate Harness System 拓展（视觉、生图、网盘、视频）的理想底座。

| 技能 | 能力 |
|------|------|
| [**Supermate-harness-launcher**](skills/Supermate-harness-launcher/) | 🚀 **一键入口（地基）**——启动 Harness → 打开夸克（调试端口 9222）→ 打开 Harness 界面 + 千问侧边栏页 → 自动点击夸克原生**"问AI"**按钮，弹出千问悬浮侧边栏。跨机型/分辨率/DPI 自适应 |
| [**quark-qwen-vision**](skills/quark-qwen-vision/) | 🖼️ **零 API Key 视觉+生图**——CDP 驱动夸克内置千问（qwen-vl + Qwen-Image 2.0）：识图、反推提示词、文生图 |
| [**Deepseek-eyes**](skills/Deepseek-eyes/) | 👁️ 给文本模型长眼睛——图片 → 本地视觉（Ollama）/ OpenAI 兼容视觉 API → 结构化文字 |
| [**doubao-creator**](skills/doubao-creator/) | 🎬 **零 API Key 文生视频**——CDP 驱动豆包网页版（Seedance 2.0）：识图、10s 竖屏广告、肖像保护破局法（先反推再锚定）|
| [**dsh-im-wecom**](skills/dsh-im-wecom/) | 💬 **企业微信智能机器人 × DSH**——`@xmanrui/dsh-im` 插件官方长连接接入，零手写桥接；**千问侧栏读图代理**：企微图片 → 夸克千问 CDP 分析 → 纯文本进模型（纯文本模型也能看图）|
| [**rh-workflow**](skills/rh-workflow/) | 🎥 RunningHub 云端 H3 工作流 API——I2V / T8 / Ref2VA 视频生成 |
| [**rh-workflow-9b**](skills/rh-workflow-9b/) | 📋 9B RH 执行宪章——本地 9B 模型无漂移执行规范 |
| [**MiniMax h3-video-producer**](skills/MiniMax%20h3-video-producer/) | 🎞️ 本地 H3 视频全流程：分镜 → H3 提示词 → 逐段生成 → 合成 + BGM |
| [**video-production-studio**](skills/video-production-studio/) | 🎥 **通用视频制作流水线**——由 zenstory-ai/drama-skills（MIT）蒸馏优化：五份创作文档 + 预览→确认→生产闸门 + **MiniMax H3 原生提示词** + 本地通道接线（Z-Image / RH Ref2VA·I2V / 豆包 Seedance / ffmpeg） |
| [**lyric-mv-storyboard**](skills/lyric-mv-storyboard/) | 🎵 **歌词驱动 MV 分镜**——歌词（支持 .lrc 时间轴）+ 角色图 → 三层表演体系（行动逻辑/表演节拍/面部时序）→ 时序分镜表 + Ref2VA 演唱提示词（一句一片段防念白），附便携 [skill.json 源](skills/lyric-mv-storyboard/json/) |
| [**SuperMate**](skills/Supermate/) | 🤖 SuperMate 智能体身份——组装好的智能体如何端到端行动 |

---

## 🚀 主打 · 一键启动：Harness + 夸克 + 千问悬浮侧边栏

> **双击一个图标 → Harness 自动启动 → 夸克打开 → 千问悬浮侧边栏在对话页右侧弹出。**

[**Supermate-harness-launcher**](skills/Supermate-harness-launcher/) 一个入口搞定整个工作环境：

1. **启动 Harness**——`http://127.0.0.1:3080` 未运行时，调用配置的启动脚本并等待就绪（最多 120s）
2. **打开夸克**——确保浏览器带 `--remote-debugging-port=9222` 运行，打开 Harness 界面 + 千问侧边栏页
3. **弹出悬浮侧边栏**——截图定位夸克原生**"问AI"**按钮（右上角蓝色 ✨ 星标）并自动点击

跨机型/分辨率/DPI 自适应：按钮像素位置随显示器变化，但**在窗口内的比例稳定**——DPI 感知截图 + 颜色扫描蓝星（取最顶部簇）+ 按宽高比换算的兜底偏移。

> ⚠️ "问AI"按钮是**开关**（再运行会关闭面板）。千问侧边栏页必须用**带参 URL**（`entry=frame&tab_id=...`）——普通 URL 只会加载坏壳（报 `SidebarService instanceId is required`）。

---

## 👁️ 主打技能 · 给 DeepSeek 装眼睛

> **图片 → 视觉模型转成文字 → 文本模型"看见"**

[**deepseek-eyes**](skills/Deepseek-eyes/) 把图片——截图、照片、图表、设计稿、插画、角色设定图、AI 生成图——转换成 DeepSeek（或任意文本模型）能推理的结构化文字。

```text
图片 / 图形文件 → Skill → 本地视觉模型或视觉 API → 结构化文字 → DeepSeek 阅读与推理
```

实测于 RTX 5080 16GB — [中文手册](skills/Deepseek-eyes/README-cn.md) · [English manual](skills/Deepseek-eyes/README-en.md)

---

## 🏛 官方内容随仓库自带

| | 数量 | 来源 |
|---|---|---|
| [skills/DSH Official](skills/DSH%20Official/) | 官方技能 13 个 | deepseek-ai · Apache-2.0 · 带 NOTICE 归属声明 fork 拷贝 |
| [plugins/DSH Official](plugins/DSH%20Official/) | 官方插件 49 族 | deepseek-ai · Apache-2.0 · 带 NOTICE 归属声明 fork 拷贝 |

---

## 🔗 生态与许可

属于 **DeepSeek Harness 插件生态**——主题 [`dsh-plugin`](https://github.com/topics/dsh-plugin) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Agent Skills](https://agentskills.io)

**许可** · [Apache-2.0](LICENSE)（含专利授权条款）· 双许可边界（核心闭源商业层：调度/记忆治理/沙箱/评测）见 [双许可说明](双许可说明.md)

---

<div align="center">

*SuperMate Harness System · 为 DeepSeek Harness 插件生态而建（主题 [`dsh-plugin`](https://github.com/topics/dsh-plugin)）*

</div>
