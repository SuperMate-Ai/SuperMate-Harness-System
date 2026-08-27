<div align="center">

# 🧩 SuperMate Harness System

**"一切皆插件" —— 基于 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 插件结构组装而成的真智能体系统。**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)
[![MiniMax H3](https://img.shields.io/badge/topic-minimax--h3-8b5cf6)](https://github.com/topics/minimax-h3)

**天人合一：云端灵感 + 本地可控 + 本地/云端工具统一应用。**

**English**：[README.md](README.md) · English README

**DSH 生态关联** · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · 主题 [`dsh-plugin`](https://github.com/topics/dsh-plugin) · [Agent Skills](https://agentskills.io)

**许可** · [Apache-2.0](LICENSE)（含专利授权条款）· 双许可边界见 [双许可说明](双许可说明.md)（核心闭源商业层：调度/记忆治理/沙箱/评测）

---

## 🧩 SuperMate Harness System 是什么

基于 DSH"一切皆插件"哲学的自包含智能体系统：**Skill 层**（教"怎么做"）+ **插件层**（提供"能做什么"）自由组装、替换。**下载本仓库即自带官方 deepseek-ai 的 skill/插件与 SuperMate 原创 skill/插件**，无需额外拉取。

```
SuperMate Harness System
 ├── skills/                        → Skill 层（任务级：教"怎么做"）
 │    ├── Deepseek-eyes/             👁️ 视觉 skill（Ollama）
 │    ├── quark-qwen-vision/         🖼️ 夸克浏览器视觉+生图（千问，零 API Key）
 │    ├── quark-harness-launcher/    🚀 一键启动：Harness + 夸克 + 千问悬浮侧边栏
 │    ├── doubao-creator/            🎬 豆包文生视频（Seedance 2.0，零 API Key）
 │    ├── rh-workflow/               🎥 RunningHub 云端 H3 工作流 API
 │    ├── rh-workflow-9b/            📋 9B RH 执行宪章
 │    ├── MiniMax h3-video-producer/
 │    ├── Supermate/
 │    └── DSH Official/             官方技能（deepseek-ai · 13 个 · Apache-2.0 fork 拷贝）
 └── plugins/                        → 插件层（系统级：能"做什么"）
      ├── Supermate/                自研插件（规划中；核心增强=闭源商业层）
      ├── DSH Official/             官方插件（deepseek-ai · 49 族 · fork 拷贝）
      │    ├── packages/            官方插件源码（随仓库自带）
      │    ├── README.md · NOTICE.md
      └── README.md                 插件清单（模型/记忆/调度/工具/沙箱/评测/UI）
```

### ✨ 原创技能

| 技能 | 能力 |
|------|------|
| [**Deepseek-eyes**](skills/Deepseek-eyes/) | 👁️ 给文本模型长眼睛——本地视觉（Ollama）/ OpenAI 兼容视觉 API → 结构化文字 |
| [**quark-qwen-vision**](skills/quark-qwen-vision/) | 🖼️ **零 API Key 视觉+生图**——CDP 网页操作驱动夸克浏览器内置千问（qwen-vl + Qwen-Image 2.0）：识图、反推提示词、文生图 |
| [**quark-harness-launcher**](skills/quark-harness-launcher/) | 🚀 **一键入口**——启动 Harness → 打开夸克（调试端口 9222）→ 打开 Harness 界面 + 千问侧边栏页 → 自动点击夸克原生"问AI"按钮，让**千问悬浮侧边栏**在对话页右侧弹出。跨机型/分辨率/DPI 自适应 |
| [**doubao-creator**](skills/doubao-creator/) | 🎬 **零 API Key 文生视频**——CDP 驱动豆包网页版（Seedance 2.0）：识图、10s 竖屏广告视频、肖像保护破局法（先反推再锚定）|

> **🔥 零 API Key 多模型矩阵**：DeepSeek（主脑）+ 千问（视觉/生图，走夸克）+ 豆包（视频，走 Seedance）+ RunningHub H3（云端视频）——全部 CDP 网页自动化驱动，无需 Ollama、无需 API Key、无需 GPU。

**官方内容随仓库自带**——官方 13 技能 + 官方 49 族插件（deepseek-ai，Apache-2.0，带 NOTICE 归属声明）：[skills/DSH Official](skills/DSH%20Official/) · [plugins/DSH Official](plugins/DSH%20Official/)。

---

## 🚀 主打 · 一键启动：Harness + 夸克 + 千问悬浮侧边栏

> **双击一个图标 → Harness 自动启动 → 夸克打开 → 千问悬浮侧边栏在对话页右侧弹出。**

[**quark-harness-launcher**](skills/quark-harness-launcher/) 是一个入口搞定整个工作环境：

1. **启动 Harness**——`http://127.0.0.1:3080` 未运行时，调用你配置的 Harness 启动脚本并等待就绪（最多 120s）
2. **打开夸克**——确保浏览器带 `--remote-debugging-port=9222` 运行，打开 Harness 界面 + 千问侧边栏页两个标签
3. **弹出悬浮侧边栏**——截图定位夸克原生**"问AI"**工具栏按钮（右上角蓝色 ✨ 星标）并自动点击，千问悬浮面板在对话页右侧滑出

跨机型/分辨率/DPI 自适应：按钮像素位置随显示器变化，但**在窗口内的比例稳定**——脚本声明 DPI 感知、截右上工具栏条、颜色扫描蓝星（取最顶部簇），兜底按宽高比换算偏移。

### 安装（一次性）

```text
1. 把 skills/quark-harness-launcher/ 拷到  ~/.dsh/skills/
2. 编辑 config.ps1：
   $HarnessStartCmd = '<你的 Harness 启动脚本路径>'   # 例 E:\deepseek-harness\start-web.cmd（留空=手动启动）
   $QuarkExe        = ''                              # 留空=自动探测夸克
   $HarnessUrl      = 'http://127.0.0.1:3080'         # 默认
```

### 使用

```powershell
# 双击 scripts\launch.bat，或：
powershell -ExecutionPolicy Bypass -File scripts\launch.ps1
```

**带红底白 H 图标的桌面快捷方式**：新建指向 `scripts\launch.bat` 的快捷方式，图标选 `assets\quark-harness.ico`。

> ⚠️ "问AI"按钮是**开关**：面板已开时再运行会先关掉它（再点一次"问AI"恢复）。千问侧边栏页必须用**带参 URL**（`entry=frame&tab_id=...`）——普通 URL 只会加载坏壳（报 `SidebarService instanceId is required`）。

---

## 👁️ 主打技能 · 给 DeepSeek 装眼睛

> **图片 → 视觉模型转成文字 → 文本模型"看见"**

[**deepseek-eyes**](skills/Deepseek-eyes/) 在 DeepSeek Harness 里给 DeepSeek（或任意文本模型）装上一双"眼睛"——截图、照片、插画、角色设定图、AI 生成图，统统变成模型能理解的结构化文字。

</div>

---

## ⚙️ 工作原理

本 Skill 通过调用**本地视觉模型（Ollama）**或 **OpenAI 兼容视觉 API**，把图片与图形文件——截图、照片、图表、设计稿、插画、角色设定图、AI 生成图——转换成结构化文字。DeepSeek 读到这些文字，就相当于"读"懂了图片和图形文件。

```text
图片 / 图形文件 → Skill → 本地视觉模型或视觉 API → 结构化文字 → DeepSeek 阅读与推理
```

---

## ✨ 技能清单

| 技能 | 功能 | 文档 |
|---|---|---|
| [**deepseek-eyes**](skills/Deepseek-eyes/) | 协助文本 AI 模型做图片分析：图片 → 结构化中文描述 + 检索标签（本地 Ollama 或 OpenAI 兼容视觉 API） | [中文](skills/Deepseek-eyes/README-cn.md) · [English](skills/Deepseek-eyes/README-en.md) |

### 架构

![架构图](skills/Deepseek-eyes/docs/architecture.png)

### 实测数据（RTX 5080 16GB）

![性能对比](skills/Deepseek-eyes/docs/benchmark.png)

---

## 🔗 与 DeepSeek Harness 的关联

本仓库属于 **DeepSeek Harness 插件生态**：在 GitHub 主题 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 下可以找到本仓库，也能找到 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 本身。把技能文件夹放进 `~/.dsh/skills/`，DSH 代理遇到图片就会自动"睁眼"，把图片描述注入文本模型的上下文。

## 🚀 安装到 DSH

把技能文件夹放进 DSH 技能目录：

```text
~/.dsh/skills/deepseek-eyes/
```

重启 DSH 会话——代理遇到图片会自动"睁眼"，把图片描述注入文本模型的上下文。

## ✅ 前提（使用 deepseek-eyes 时）

1. **本地视觉模型**：[Ollama](https://ollama.com) + `ollama pull llava:13b`（或任意 vision 模型）
2. 或 **OpenAI 兼容视觉 API** + API Key

---

<div align="center">

*SuperMate Harness System · 为 DeepSeek Harness 插件生态而建（主题 [`dsh-plugin`](https://github.com/topics/dsh-plugin)）*

</div>
