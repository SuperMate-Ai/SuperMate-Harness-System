<div align="center">

# 🧩 SuperMate Harness System

**"Everything is a plugin"** — a self-contained true agent assembled from the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin architecture. Download once, get **official deepseek-ai skills/plugins + SuperMate originals** — no extra fetching.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)
[![MiniMax H3](https://img.shields.io/badge/topic-minimax--h3-8b5cf6)](https://github.com/topics/minimax-h3)
[![Vision](https://img.shields.io/badge/vision-deepseek--eyes-6f42c1)](skills/Deepseek-eyes/)
[![Zero API Key](https://img.shields.io/badge/zero--api--key-CDP%20web%20automation-28a745)](skills/quark-qwen-vision/)

**天人合一 · Heaven–Human Unity** — cloud inspiration · local controllability · unified local/cloud tools

**中文版**：[README-cn.md](README-cn.md)

</div>

---

## ✨ Highlights

| | |
|---|---|
| 🧠 **AI Brain** | DeepSeek (cloud) + local LLMs — reason, plan, generate |
| 👁️ **Eyes** | Vision skills — Ollama local, Quark-browser Qwen, or any OpenAI-compatible API |
| 🎬 **Studio** | Video production — Doubao Seedance 2.0, RunningHub MiniMax H3, all web-automation driven |
| 🚀 **One-Click Entry** | Launch Harness + Quark + Qianwen floating sidebar with one icon |
| 🧩 **Everything is a Plugin** | Skills (how-to) + Plugins (can-do), freely composed & replaced |
| 🔥 **Zero API Key Matrix** | DeepSeek brain + Qwen vision/image-gen + Doubao video + H3 cloud video — all via CDP web automation, no Ollama, no API keys, no GPU needed |

---

## 📦 What's Inside

```
SuperMate Harness System
 ├── skills/                        → Skill layer (task-level: how-to)
 │    ├── Deepseek-eyes/             👁️ vision skill (Ollama / vision API)
 │    ├── quark-qwen-vision/         🖼️ Quark-browser vision + image gen (zero API key)
 │    ├── quark-harness-launcher/    🚀 one-click launch: Harness + Quark + Qianwen sidebar
 │    ├── doubao-creator/            🎬 Doubao text-to-video (Seedance 2.0, zero API key)
 │    ├── rh-workflow/               🎥 RunningHub cloud H3 workflow API
 │    ├── rh-workflow-9b/            📋 9B RH executor charter
 │    ├── MiniMax h3-video-producer/ 🎞️ H3 video production pipeline
 │    ├── Supermate/                 🤖 the SuperMate agent identity
 │    └── DSH Official/              official deepseek-ai skills (13 · fork copy)
 └── plugins/                        → Plugin layer (system-level: can-do)
      ├── Supermate/                 in-house plugins (core enhancements = closed-source commercial)
      └── DSH Official/              official deepseek-ai plugins (49 families · fork copy)
```

---

## ⚡ Quick Start

```powershell
# 1. Copy any skill folder into DSH's skill directory
Copy-Item skills\Deepseek-eyes\ ~\.dsh\skills\ -Recurse

# 2. Restart the DSH session — the agent "opens its eyes" whenever it meets an image
#    (injects the image description into the text model's context)

# 3. For the one-click environment (Harness + Quark + Qianwen sidebar):
#    copy skills/quark-harness-launcher/ → ~/.dsh/skills/, edit config.ps1, then:
powershell -ExecutionPolicy Bypass -File scripts\launch.ps1
```

---

## 🧩 Original Skills

| Skill | What it does |
|-------|--------------|
| [**Deepseek-eyes**](skills/Deepseek-eyes/) | 👁️ Give text models eyes — image → local vision (Ollama) / OpenAI-compatible vision API → structured text |
| [**quark-qwen-vision**](skills/quark-qwen-vision/) | 🖼️ **Zero API key vision + image gen** — drive Quark browser's built-in Qwen (qwen-vl + Qwen-Image 2.0) via CDP: image analysis, prompt reverse-engineering, text-to-image |
| [**quark-harness-launcher**](skills/quark-harness-launcher/) | 🚀 **One-click entry** — start Harness → open Quark (debug port 9222) → open Harness GUI + Qianwen sidebar → auto-click Quark's native **"问AI"** button so the floating Qianwen side panel pops up. Cross-machine / resolution / DPI aware |
| [**doubao-creator**](skills/doubao-creator/) | 🎬 **Zero API key text-to-video** — drive Doubao web (Seedance 2.0) via CDP: image analysis, 10s vertical video ads, portrait-protection workaround (describe-then-anchor) |
| [**rh-workflow**](skills/rh-workflow/) | 🎥 RunningHub cloud H3 workflow API — I2V / T8 / Ref2VA video generation |
| [**rh-workflow-9b**](skills/rh-workflow-9b/) | 📋 9B RH executor charter — no-drift execution rules for local 9B models |
| [**MiniMax h3-video-producer**](skills/MiniMax%20h3-video-producer/) | 🎞️ Local H3 full video production: storyboard → H3 prompts → segment generation → assembly + BGM |
| [**SuperMate**](skills/Supermate/) | 🤖 The SuperMate agent identity — how the assembled agent behaves end-to-end |

---

## 🚀 Featured · One-Click Launch — Harness + Quark + Qianwen Sidebar

> **Double-click one icon → Harness starts → Quark opens → the Qianwen floating sidebar slides out next to your conversation.**

[**quark-harness-launcher**](skills/quark-harness-launcher/) is a single entry point for your whole working environment:

1. **Start Harness** — if `http://127.0.0.1:3080` is not up, launch your configured start script and wait until ready (≤120s)
2. **Open Quark** — ensure the browser runs with `--remote-debugging-port=9222`, open the Harness GUI tab + the Qianwen sidebar page
3. **Pop the floating sidebar** — screenshot-locate Quark's native **"问AI"** toolbar button (blue ✨ star, top-right) and auto-click it

Cross-machine / resolution / DPI aware: the button's pixel position varies, but its **ratio inside the window is stable** — DPI-aware capture + color scan of the blue star (topmost cluster) + ratio-scaled fallback.

> ⚠️ The "问AI" button is a **toggle** (running again closes the panel). The Qianwen sidebar page must use the parameterized URL (`entry=frame&tab_id=...`) — the plain URL only loads a broken shell.

---

## 👁️ Featured · Give DeepSeek Eyes

> **Image → vision model converts it to text → the text model "sees"**

[**deepseek-eyes**](skills/Deepseek-eyes/) converts images — screenshots, photos, charts, design drafts, illustrations, character sheets, AI-generated images — into structured text that DeepSeek (or any text model) can reason about.

```text
Image / graphic file → Skill → local vision model or vision API → structured text → DeepSeek reads & reasons
```

Measured on RTX 5080 16GB — [English manual](skills/Deepseek-eyes/README-en.md) · [中文手册](skills/Deepseek-eyes/README-cn.md)

---

## 🏛 Official Content Ships With This Repo

| | Count | Source |
|---|---|---|
| [skills/DSH Official](skills/DSH%20Official/) | 13 official skills | deepseek-ai · Apache-2.0 · NOTICE-attributed fork copy |
| [plugins/DSH Official](plugins/DSH%20Official/) | 49 official plugin families | deepseek-ai · Apache-2.0 · NOTICE-attributed fork copy |

---

## 🔗 Ecosystem & License

Part of the **DeepSeek Harness plugin ecosystem** — topic [`dsh-plugin`](https://github.com/topics/dsh-plugin) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Agent Skills](https://agentskills.io)

**License** · [Apache-2.0](LICENSE) with patent terms · dual-license boundary (closed-source commercial core: scheduling / memory governance / sandbox / evaluation) — see [双许可说明](双许可说明.md)

---

<div align="center">

*SuperMate Harness System · Built on the DeepSeek Harness (DSH) plugin ecosystem — topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)*

</div>
