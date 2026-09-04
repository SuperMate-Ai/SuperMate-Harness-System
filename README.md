<div align="center">

# <img src="assets/quark-harness.png" width="42" height="42" align="middle" style="vertical-align: middle;" alt="SuperMate Harness" /> SuperMate Harness System

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
| 🚀 **One-Click Entry** | Launch Harness + Quark + Qianwen floating sidebar with one icon |
| 🧠 **AI Brain** | DeepSeek (cloud) + local LLMs — reason, plan, generate |
| 👁️ **Eyes** | Vision skills — Ollama local, Quark-browser Qwen, or any OpenAI-compatible API |
| 🎬 **Studio** | Video production — Doubao Seedance 2.0, RunningHub MiniMax H3, all web-automation driven |
| 🧩 **Everything is a Plugin** | Skills (how-to) + Plugins (can-do), freely composed & replaced |
| 🔥 **Zero API Key Matrix** | DeepSeek brain + Qwen vision/image-gen + Doubao video + H3 cloud video — all via CDP web automation, no Ollama, no API keys, no GPU needed |

---

## 📦 What's Inside

```
SuperMate Harness System
 ├── skills/                        → Skill layer (task-level: how-to)
 │    ├── Supermate-harness-launcher/ 🚀 one-click launch: Harness + Quark + Qianwen sidebar
 │    ├── quark-qwen-vision/         🖼️ Quark-browser vision + image gen (zero API key)
 │    ├── Deepseek-eyes/             👁️ vision skill (Ollama / vision API)
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

**One-click environment** — Harness + Quark + Qianwen floating sidebar:

```powershell
# 1. Copy the launcher skill into DSH's skill directory
Copy-Item skills\Supermate-harness-launcher\ ~\.dsh\skills\ -Recurse

# 2. Edit config.ps1 — set your Harness start command / Quark path
#    $HarnessStartCmd = 'E:\deepseek-harness-v013\start-web.cmd'   (empty = start Harness manually)

# 3. Run it — Harness starts, Quark opens, the Qianwen floating sidebar pops up
powershell -ExecutionPolicy Bypass -File scripts\launch.ps1
```

> Any other skill works the same way: copy its folder into `~/.dsh/skills/` and restart the DSH session.

---

## 🧩 Original Skills

> **Built around the Quark browser** — Quark ships with the built-in **Qianwen sidebar** + **Quark Netdisk**, making it the ideal foundation for the SuperMate Harness System's extensions (vision, image generation, netdisk, video).

| Skill | What it does |
|-------|--------------|
| [**Supermate-harness-launcher**](skills/Supermate-harness-launcher/) | 🚀 **One-click entry (foundation)** — start Harness → open Quark (debug port 9222) → open the Harness GUI + Qianwen sidebar → auto-click Quark's native **"问AI"** button so the floating Qianwen side panel pops up next to your conversation. Cross-machine / resolution / DPI aware |
| [**quark-qwen-vision**](skills/quark-qwen-vision/) | 🖼️ **Zero API key vision + image gen** — drive Quark browser's built-in Qwen (qwen-vl + Qwen-Image 2.0) via CDP: image analysis, prompt reverse-engineering, text-to-image |
| [**Deepseek-eyes**](skills/Deepseek-eyes/) | 👁️ Give text models eyes — image → local vision (Ollama) / OpenAI-compatible vision API → structured text |
| [**dsh-deepseek-vision-bridge**](skills/dsh-deepseek-vision-bridge/) | 🧠 **ARCHITECTURAL BREAKTHROUGH — text DeepSeek natively reads images** — a patch on DSH's own `llm-deepseek` adapter: paste an image into the Harness GUI and `deepseek-v4-flash` (pure text, `inputModalities:['text']`) accepts it. The adapter auto-routes each image through the **Quark Qianwen sidebar** (CDP, zero VRAM / zero API key) and injects a clean Chinese description before serialization. The model never "sees" the image — yet fully understands it. Works for GUI, IM, any DeepSeek-bound image. Multi-image serial + cooldown, success-only caching, auto-retry, zero regression without the attachment seam |
| [**doubao-creator**](skills/doubao-creator/) | 🎬 **Zero API key text-to-video** — drive Doubao web (Seedance 2.0) via CDP: image analysis, 10s vertical video ads, portrait-protection workaround (describe-then-anchor) |
| [**dsh-im-wecom**](skills/dsh-im-wecom/) | 💬 **WeCom bot × DSH** — connect WeCom smart bots to Harness via the `@xmanrui/dsh-im` plugin (official long connection, zero hand-written bridge); **Qianwen sidebar image proxy**: WeCom images → Quark Qwen CDP analysis → text-only into the model (text-only models can "see" images) |
| [**rh-workflow**](skills/rh-workflow/) | 🎥 RunningHub cloud H3 workflow API — I2V / T8 / Ref2VA video generation |
| [**rh-workflow-9b**](skills/rh-workflow-9b/) | 📋 9B RH executor charter — no-drift execution rules for local 9B models |
| [**MiniMax h3-video-producer**](skills/MiniMax%20h3-video-producer/) | 🎞️ Local H3 full video production: storyboard → H3 prompts → segment generation → assembly + BGM |
| [**video-production-studio**](skills/video-production-studio/) | 🎥 **General-purpose video production pipeline** — distilled from zenstory-ai/drama-skills (MIT): five creator documents + preview→confirm→produce gate + **native MiniMax H3 prompts** + local channel wiring (Z-Image / RH Ref2VA·I2V / Doubao Seedance / ffmpeg) |
| [**lyric-mv-storyboard**](skills/lyric-mv-storyboard/) | 🎵 **Lyric-driven MV storyboard** — lyrics (or .lrc timeline) + character image → three-layer acting system (goal/beat/facial timing) → timed storyboard + Ref2VA singing prompts (one line per clip to avoid recitation); portable [skill.json sources](skills/lyric-mv-storyboard/json/) included |
| [**SuperMate**](skills/Supermate/) | 🤖 The SuperMate agent identity — how the assembled agent behaves end-to-end |

---

## 🚀 Featured · One-Click Launch — Harness + Quark + Qianwen Sidebar

> **Double-click one icon → Harness starts → Quark opens → the Qianwen floating sidebar slides out next to your conversation.**

[**Supermate-harness-launcher**](skills/Supermate-harness-launcher/) is a single entry point for your whole working environment:

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

### 🧠 The Architectural Breakthrough · [dsh-deepseek-vision-bridge](skills/dsh-deepseek-vision-bridge/)

> **"Seeing" is a capability, not a model property.** DeepSeek's weights contain no vision encoder — that is a physical limit no prompt trick can cross. But this bridge proves the harness can cross it at the **architecture level**: the vision channel (Quark Qianwen sidebar) is promoted from "call it by hand" to "an automatic stage of the model-request pipeline".

```text
Paste image into GUI → host accepts (adapter now declares image input)
  → image kept durably (visible in history, never lost)
  → llm-deepseek adapter, before every request, scans image blocks
  → Quark Qianwen sidebar (CDP) describes each one (~6-12s, cached after)
  → clean text replaces the image block → serialize (assertTextOnly never fires)
  → DeepSeek answers as if it saw the picture
```

**Why this is a breakthrough — not a trick:**

- **Native layer, universal effect** — the patch lives in DSH's own `llm-deepseek` adapter, so **every** DeepSeek-bound image — GUI paste, IM channels, anything — goes through it. No per-channel bridge to maintain (unlike bridge-only approaches).
- **The image is never lost** — original bytes stay in the durable attachment store; only the copy sent to the model becomes text.
- **Zero VRAM, zero tokens** — vision rides the already-open Quark browser over CDP; nothing loads into the 16 GB GPU that ComfyUI H3 sampling needs.
- **Built to run, not demo** — strict serial + 1.5s cooldown (the sidebar is a web session and stalls under bursts), **success-only caching** (same image = ms on repeat), failure degrades to a placeholder and **auto-retries next turn** (never poisons later requests), and the composition **without the attachment seam keeps native text-only behavior** (zero regression, 158 tests green).
- **Upstream-general, not SuperMate-private** — the patch touches only the official `@deepseek-ai/dsh-llm-deepseek` package; every dependency is `@deepseek-ai/*` + Node built-ins + stock Quark CDP. Clone official `deepseek-ai/deepseek-harness`, drop in `patch/`, rebuild, restart — same capability. This repo is just its distribution point (upstream-contributable).
- **Two agents beat a projector** — local multimodal models bolt on an `mmproj` for weight-level static alignment (a fixed local eye you cannot interrogate). This bridge instead has the text agent (DeepSeek) auto-invoke the **cloud full-strength Qianwen** (qwen-vl-max class) at runtime: a borrowed eye far sharper than any local 9B/35B vision model, and one you can **conversationally interrogate, swap, and iterate** — impossible with a static mmproj.
- **Honest boundary** — first image costs ~10 s inside the model request; the cache is per-process; the sidebar being a session is the ceiling for extreme multi-image bursts.

Source patch + docs: `skills/dsh-deepseek-vision-bridge/patch/` · rollback included.

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
