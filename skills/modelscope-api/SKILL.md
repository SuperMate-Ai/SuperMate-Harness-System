---
name: modelscope-api
description: ModelScope（魔塔）免费 API 客户端——零依赖 Python 脚本，OpenAI 协议直连魔塔推理服务：chat 文本对话（Qwen3-235B / DeepSeek-V4-Flash / GLM-4.7-Flash 等）、vision 图片理解（Qwen3-VL-235B）、image 文生图（Z-Image-Turbo / Qwen-Image-2512 / FLUX.2-klein-9B）、models 列出可用模型。当用户要免费 LLM/视觉/生图、或提到魔塔/ModelScope/免费 API 通道时使用。铁律：API Key 只存本地（环境变量或本地 Api_key_modelscope.txt），绝不提交 GitHub。
user-invocable: true
---

# ModelScope（魔塔）免费 API 客户端

> 魔塔推理服务（api-inference.modelscope.cn）免费开放大量模型，OpenAI 协议，零第三方依赖（仅标准库 urllib），Python 3.8+ 直接跑。
> 实测打通：Qwen3-235B 对话 / Qwen3-VL-235B 看图 / Z-Image-Turbo 文生图。

## 脚本位置

```
skills/modelscope-api/scripts/modelscope_api.py   # 客户端（本仓库自带，clone 即用）
```

**API Key 解析优先级**：`--api-key` 参数 > 环境变量 `MODELSCOPE_API_KEY` > 本地文件 `Api_key_modelscope.txt`（脚本同目录或上一级目录，二选一）。

**🔒 铁律**：Key 只写本地（如 `Local_LLM\Api_key_modelscope.txt` 或 `~/.dsh/skills/modelscope-api/Api_key_modelscope.txt`），**绝不提交 GitHub**（仓库 `.gitignore` 已忽略 `Api_key*.txt`）。

## 用法

```bash
# 文本对话（默认 Qwen3-235B-A22B）
python modelscope_api.py chat "用一句话介绍你自己"
python modelscope_api.py chat "..." --model deepseek-ai/DeepSeek-V4-Flash-0731

# 图片理解（默认 Qwen3-VL-235B-A22B-Instruct）
python modelscope_api.py vision D:/img.png "翻译图中文字，重点讲 X"

# 文生图（默认 Z-Image-Turbo，异步任务自动轮询）
python modelscope_api.py image "赛博朋克城市夜景" --size 1024x1024 -o out.png

# 列出可用模型（免费模型池很大：Qwen3 全家 / DeepSeek-V4 / GLM-5.2 / MiniMax-M3 / ERNIE ...）
python modelscope_api.py models
```

可选参数：`--base-url`（国内默认 `https://api-inference.modelscope.cn/v1`；国外换 `https://api-inference.modelscope.ai/v1`）、`--timeout`、`--out-dir`。

## 踩坑记录（重要）

- **生图是异步任务**：POST `/images/generations` 需带 `X-ModelScope-Async-Mode: true`，返回 `task_id`；然后轮询 `GET /tasks/{task_id}`——**必须带 `X-ModelScope-Task-Type: image_generation` header**（不带会报 `task not found`）。成功取 `output_images[0]`。
- **models 端点不含全部生图模型**：`/v1/models` 主要返回聊天模型；Z-Image-Turbo / Qwen-Image-2512 / FLUX.2-klein-9B 等生图模型是魔塔"模型服务"，不在该列表——直接用 `image` 命令跑即可。
- **免费 tier 有速率限制**：轻度使用没问题，重度任务走本地 ComfyUI / 付费通道。

## 关联

- `infinite-canvas`（无限画布内置 ModelScope 供应商，UI 里直接选模型）
- `quark-qwen-vision`（夸克千问看图，另一个零 Key 视觉通道）
- 本地 ComfyUI Z-Image（同源模型，无速率限制）
