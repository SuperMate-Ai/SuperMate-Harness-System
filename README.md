<div align="center">

# 🧩 SuperMate Harness System

**"Everything is a plugin" — a true agent assembled from the [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) plugin architecture.**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)
[![MiniMax H3](https://img.shields.io/badge/topic-minimax--h3-8b5cf6)](https://github.com/topics/minimax-h3)

**Cloud inspiration · Local controllability · Unified local/cloud tools** — 天人合一（heaven–human unity: cloud inspiration + local control + unified tools）.

**中文版**：[README-cn.md](README-cn.md) · 中文说明

**DSH Ecosystem** · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · topic [`dsh-plugin`](https://github.com/topics/dsh-plugin) · [Agent Skills](https://agentskills.io)

**License** · [Apache-2.0](LICENSE)（含专利授权条款）· 双许可边界见 [双许可说明](双许可说明.md)（核心闭源商业层：调度/记忆治理/沙箱/评测）

---

## 🧩 What is SuperMate Harness System

A self-contained agent system built on DSH's *"everything is a plugin"* philosophy: **Skills** (the *how-to* layer) + **Plugins** (the *can-do* layer) freely composed and replaced. Downloading this repository gives you **both official deepseek-ai skills/plugins and SuperMate's original ones** — no extra fetching required.

```
SuperMate Harness System
 ├── skills/                        → Skill layer (task-level: how-to)
 │    ├── Deepseek-eyes/             👁️ vision skill (Ollama)
 │    ├── quark-qwen-vision/         🖼️ Quark-browser vision + image gen (Qwen, zero API key)
 │    ├── quark-harness-launcher/    🚀 One-click launch: Harness + Quark + Qianwen floating sidebar
 │    ├── doubao-creator/            🎬 Doubao text-to-video (Seedance 2.0, zero API key)
 │    ├── rh-workflow/               🎥 RunningHub cloud H3 workflow API
 │    ├── rh-workflow-9b/            📋 9B RH executor charter
 │    ├── MiniMax h3-video-producer/
 │    ├── Supermate/
 │    └── DSH Official/              official skills (deepseek-ai · 13 · Apache-2.0 fork copy)
 └── plugins/                        → Plugin layer (system-level: can-do)
      ├── Supermate/                 in-house plugins (planned; core enhancements = closed-source commercial)
      ├── DSH Official/              official plugins (deepseek-ai · 49 families · fork copy)
      │    ├── packages/             official plugin source (ships with the repo)
      │    ├── README.md · NOTICE.md
      └── README.md                  plugin catalog (model / memory / schedule / tools / sandbox / eval / UI)
```

### ✨ Original Skills

| Skill | What it does |
|-------|--------------|
| [**Deepseek-eyes**](skills/Deepseek-eyes/) | 👁️ Give text models eyes — local vision (Ollama) / OpenAI-compatible vision API → structured text |
| [**quark-qwen-vision**](skills/quark-qwen-vision/) | 🖼️ **Zero API key vision + image gen** — drive Quark browser's built-in Qwen (qwen-vl + Qwen-Image 2.0) via CDP web automation: image analysis, prompt reverse-engineering, text-to-image |
| [**quark-harness-launcher**](skills/quark-harness-launcher/) | 🚀 **One-click entry** — start Harness → open Quark (debug port 9222) → open the Harness GUI + Qianwen sidebar → auto-click Quark's native "问AI" button so the **floating Qianwen side panel** pops up next to your conversation. Cross-machine / resolution / DPI aware |
| [**doubao-creator**](skills/doubao-creator/) | 🎬 **Zero API key text-to-video** — drive Doubao web (Seedance 2.0) via CDP: image analysis, 10s vertical video ads, portrait-protection workaround (describe-then-anchor) |

> **🔥 Zero-API-key multi-model matrix**: DeepSeek (brain) + Qwen (vision/image-gen via Quark) + Doubao (video via Seedance) + RunningHub H3 (cloud video) — all driven by CDP web automation, no Ollama, no API keys, no GPU needed.

**Official content ships with this repo** — 13 official skills & 49 official plugin families (deepseek-ai, Apache-2.0, NOTICE-attributed): [skills/DSH Official](skills/DSH%20Official/) · [plugins/DSH Official](plugins/DSH%20Official/).

---

## 🚀 Featured · One-Click Launch — Harness + Quark + Qianwen Sidebar

> **Double-click one icon → Harness starts → Quark opens → the Qianwen floating sidebar pops up next to your conversation.**

[**quark-harness-launcher**](skills/quark-harness-launcher/) is a single entry point for your whole working environment:

1. **Start Harness** — if `http://127.0.0.1:3080` is not up, launch your Harness start script (configurable) and wait until it responds (≤120s)
2. **Open Quark** — ensure the browser runs with `--remote-debugging-port=9222`, open the Harness GUI tab + the Qianwen sidebar page
3. **Pop the floating sidebar** — screenshot-locate Quark's native **"问AI"** toolbar button (blue ✨ star, top-right) and auto-click it, so the Qianwen **floating side panel** slides out beside your chat

Cross-machine / resolution / DPI aware: the button's pixel position varies with display, but its **ratio inside the window is stable** — the script declares DPI awareness, captures the top-right toolbar strip, color-scans the blue star (topmost cluster), and falls back to ratio-scaled offsets.

### Install (one time)

```text
1. Copy skills/quark-harness-launcher/  →  ~/.dsh/skills/
2. Edit config.ps1:
   $HarnessStartCmd = '<path to your Harness start script>'   # e.g. E:\deepseek-harness\start-web.cmd  (empty = start Harness manually)
   $QuarkExe        = ''                                      # empty = auto-detect Quark browser
   $HarnessUrl      = 'http://127.0.0.1:3080'                 # default
```

### Use

```powershell
# double-click, or:
powershell -ExecutionPolicy Bypass -File scripts\launch.ps1
```

**Desktop shortcut with the red-H icon**: create a shortcut to `scripts\launch.bat` and set its icon to `assets\quark-harness.ico`.

> ⚠️ The "问AI" button is a **toggle**: if the sidebar is already open, running again closes it (click it once more to reopen). The Qianwen sidebar page must use the parameterized URL (with `entry=frame&tab_id=...`) — the plain URL only loads a broken shell (`SidebarService instanceId is required`).

---

## 👁️ Featured Skill · Give DeepSeek Eyes

> **Image → vision model converts it to text → the text model "sees"**

[**deepseek-eyes**](skills/Deepseek-eyes/) gives DeepSeek (or any text model) a pair of eyes inside DeepSeek Harness — screenshots, photos, charts, design drafts, illustrations, character sheets, AI-generated images all become structured text the model can reason about.

</div>

---

## ⚙️ How it works

The Skill calls a **local vision model (Ollama)** or an **OpenAI-compatible vision API** to convert images and graphic files — screenshots, photos, charts, design drafts, illustrations, character sheets, AI-generated images — into structured text. DeepSeek then reads that text, which is exactly how it gains the ability to "read" images and graphic files.

```text
Image / graphic file → Skill → local vision model or vision API → structured text → DeepSeek reads & reasons
```

---

## ✨ The Skill

| Skill | What it does | Manuals |
|---|---|---|
| [**deepseek-eyes**](skills/Deepseek-eyes/) | Image analysis for text AI models: image → structured description + retrieval tags. Local Ollama or OpenAI-compatible vision API. | [English](skills/Deepseek-eyes/README-en.md) · [中文](skills/Deepseek-eyes/README-cn.md) |

### Architecture

![Architecture](skills/Deepseek-eyes/docs/architecture-en.png)

### Measured performance (RTX 5080 16GB)

![Benchmark](skills/Deepseek-eyes/docs/benchmark-en.png)

---

## 🔗 DeepSeek Harness Ecosystem

This repository is part of the **DeepSeek Harness plugin ecosystem** — find it under the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic, alongside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) itself. Drop a skill folder into `~/.dsh/skills/`, and the DSH agent automatically "opens its eyes" whenever it meets an image, injecting the image description into the text model's context.

## 🚀 Install into DSH

Put the skill folder into DSH's skill directory:

```text
~/.dsh/skills/deepseek-eyes/
```

Restart the DSH session — the agent automatically "opens its eyes" when it meets an image, and injects the image description into the text model's context.

## ✅ Prerequisites (for deepseek-eyes)

1. **Local vision model**: [Ollama](https://ollama.com) + `ollama pull llava:13b` (or any vision model)
2. or **OpenAI-compatible vision API** + API key

---

<div align="center">

*SuperMate Harness System · Built on the DeepSeek Harness (DSH) plugin ecosystem — topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)*

</div>
