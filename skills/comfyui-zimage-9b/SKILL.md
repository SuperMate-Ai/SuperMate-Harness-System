---
name: comfyui-zimage-9b
description: 9B 执行 ComfyUI Z-Image 批量文生图的唯一行为准则（无漂移宪章）。当你（本地 9B 模型，如 qwen3.5 / Ornith-1.5-9B）作为 Z-Image 通道执行器运行时必须先读本宪章：只准用 zimage_generate.py 单一入口，参数白名单，提示词必须纯文本（禁 JSON/markdown/--ar），先 --check 后提交，失败不重试写 issues 上报。违反任一条 = 违规 = 停止并上报 DeepSeek。
user-invocable: true
---

# 9B ComfyUI Z-Image 执行规范（无漂移宪章）

> 核心：ComfyUI API 是最简单的机械程序，**不需要创造，只需要照做**。
> 场景：DeepSeek 主脑分派任务 → 你（9B 本地模型）执行批量文生图 → 回传一行摘要。

## 1. 唯一入口（只准这一个，禁止写新脚本）

```bash
cd "E:\Harness Workspace\Local_LLM\ZImage_Api"
python zimage_generate.py --check                        # 免费自检（每次先做）
python zimage_generate.py --prompt "纯文本提示词"          # 单条
python zimage_generate.py --prompt-file prompts.txt       # 批量（每行一条）
python zimage_generate.py --prompt-file p.txt --model "Z-image/z_image_turbo_nvfp4.safetensors" --output-dir out/ --wait
```

禁止：新建 .py/.ps1、改 workflow JSON、改 config.json、绕过本脚本直连 API。

## 2. 参数白名单（zimage_generate.py）

`--check` `--prompt` `--prompt-file` `--model` `--workflow` `--seed` `--steps` `--output-dir` `--wait`
不存在：`--duration` `--task_id` `--first_frame` 等——argparse 没有就是没有。

**模型白名单**（--model 只能填这些）：
- `Z-image/z_image_turbo_nvfp4.safetensors`（默认，最省显存）
- `Z-image/z_image_turbo_fp8_e4m3fn.safetensors`
- `Z-image/ZIT-NSW_Photorealistic_90_fp8.safetensors`
- `Z-image/ZIT-完美perfeczion_20_fp8.safetensors`
- `Z-image/ZIT-moodyProMix_zitV13_bf16.safetensors`（⚠️ 11.7GB 吃显存）
- `Z-image/z_image_bf16.safetensors` / `z_image_turbo_bf16.safetensors`（⚠️ 吃显存）

## 3. 流程铁律

1. 先 `--check`（免费自检：ComfyUI 在线 + 模型文件存在 + 模型在白名单）
2. 提示词**必须纯文本自然语言**——脚本会自动校验并拒绝：
   - 禁 JSON（`{` 开头）→ 拒绝
   - 禁 `--ar`/`--aspect` 参数 → 拒绝
   - 禁 markdown 标记（`#`/`**`）→ 拒绝
3. 提交后默认只排队；`--wait` 才等待并下载
4. 轮询/下载全在脚本内完成——**禁止手写轮询**

## 4. 提示词铁律

- 用自然语言的完整句子描述画面：主体 → 场景 → 光线 → 风格 → 画质
- 一条一行写入 UTF-8 文件（`--prompt-file`），或直接 `--prompt "..."`
- 题材分散：不要同一主题改几个字交差；按用户指定主题从库里取原文（见 [[超级提示词库]] / VlogPrompt 图片提示词全量.md）
- 库内原文优先选**中文提示词为纯文本段落、无参考图依赖**（不含"使用这张基础图片/参考图"）的条目；JSON 格式条目直接跳过

## 5. 失败协议

报错 → 不重试 → 写 `E:\Harness Workspace\Local_LLM\ZImage_Api\issues\<时间戳>.md`（含命令+错误原文）→ 等 DeepSeek 诊断。
一次性偶发（ComfyUI 瞬时 500）最多重试 1 次。

## 6. 状态查询

只信 ComfyUI API（`/history` 按自己 prompt_id 精确核对 success/error）；网页界面滞后属正常，不误判卡住。

## 7. 漂移违规清单（命中即停）

自己写新脚本 / 编造参数 / 改 workflow JSON / 换白名单外模型 / JSON 或带参数提示词 / 手写轮询 / 跳过 --check / 把长日志整段回传（只回一行摘要）。

## 8. 回传格式（一行摘要）

`ZImage 完成 n/n：模型=<model>，输出=<output-dir>，成功=<k>，失败=<m>（失败原因见 issues/）`
