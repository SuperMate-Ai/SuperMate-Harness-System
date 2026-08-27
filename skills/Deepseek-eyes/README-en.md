# deepseek-eyes
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)

## Theme: Image analysis for text AI models — Give Text Models Eyes in DeepSeek Harness

[DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) is the open-source agent harness by [DeepSeek AI](https://deepseek.com) — everything is a plugin. The text model inside DSH — **DeepSeek** by default — can only read text. **It cannot see images.** That is its biggest capability gap.

**This skill is a DSH Skill that fills exactly that gap**: it gives DeepSeek inside DSH a pair of eyes.

> **Image → vision model converts it to text → DeepSeek "sees"**

![architecture](docs/architecture-en.png)

With this skill installed, whenever the DSH agent encounters an image (screenshot, photo, illustration, character sheet, AI-generated image...), it automatically "opens its eyes": a local vision model translates the image into **structured text description + retrieval tags**, which are injected into DeepSeek's context — DeepSeek can then understand, reason, and answer based on the image content.

> The text model in DSH is not limited to DeepSeek — it can be any other text model (including locally deployed ones). The "eyes" are universal: whoever uses them gains vision.

## Install in DeepSeek Harness

Put the `deepseek-eyes` folder into DSH's skill directory:

```text
~/.dsh/skills/deepseek-eyes/
```

Restart the DSH session and the skill is picked up and enabled automatically.

## Use in DeepSeek Harness

**Automatic mode (recommended)**: the DSH agent "opens its eyes" automatically in these tasks — no manual steps:

- Asset entry (turn images into text description + tags for archiving)
- Prompt management (view images to write prompts / manage image assets)
- Screenshot understanding (analyze images you paste into the DSH conversation)
- Image comparison (let DeepSeek compare the content of two images)

**Manual mode**: run the script in your DSH environment and paste the output into the conversation:

```powershell
# Local "eyes" (Ollama + vision model, default llava:13b)
.\deepseek-eyes.ps1 -ImagePath "D:\pics\photo.webp"

# Cloud "eyes" (OpenAI-compatible vision API, e.g. gpt-4o / qwen-vl)
$env:VISION_API_KEY = "sk-..."
.\deepseek-eyes.ps1 -ImagePath "D:\pics\photo.png" -Provider openai -Model "gpt-4o-mini"
```

Example output (injected directly into DeepSeek's context):

```text
This is a character design sheet... (structured description)
Tags: HARUMIN, character-sheet, orange-striped top, silver band-aid, short-haired girl, voice description
```

**The script preprocesses automatically**: converts any format (WebP, etc.) to PNG and downscales the long edge to 1080px — feeding a huge image raw makes the model slow and the output blurry (token explosion); after downscaling, the "eyes" read clearer, faster, and cheaper.

## Configuration (effective in the DSH environment)

| Parameter | Default | Description |
|---|---|---|
| `-Provider` | `local` | `local` (Ollama) / `openai` (compatible API) |
| `-Model` | `llava:13b` | Vision model (the "eyes") |
| `-Endpoint` | `http://127.0.0.1:11434` | Service endpoint |
| `-ApiKey` | (empty) | Required only for `openai` (or `$env:VISION_API_KEY`) |
| `-MaxEdge` | `1080` | Long-edge downscale limit (px) |

Environment variables (`VISION_MODEL` / `VISION_ENDPOINT` / `VISION_API_KEY` / `VISION_PROVIDER`) can be set once in the DSH launch environment.

## How good are these "eyes"? (DSH local vision partner · RTX 5080 16GB, measured)

- ~**5-10s** per image, producing **300-700 tokens** of description;
- Local vision front-end `Qwen3.6-35B-IQ3_S`: **100% GPU, 118 tok/s** (the only full-speed option);
- Preprocessing gain: large image tokens drop from **3647 to 713** (-80%), 24x faster, no perceptible quality loss.

![benchmark](docs/benchmark-en.png)

## Prerequisites (either)

1. **Local vision model**: install [Ollama](https://ollama.com) and `ollama pull llava:13b` (or any vision model);
2. **OpenAI-compatible vision API**: any provider + API key.

---

Implementation details, full parameters and FAQ: see `SKILL.md` and `deepseek-eyes.ps1`.
