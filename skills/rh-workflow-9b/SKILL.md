---
name: rh-workflow-9b
description: 9B 执行 RunningHub（RH）工作流 API 的唯一行为准则（无漂移宪章）。当你（本地 9B 模型）作为 RH 通道执行器运行时必须先读本宪章：只允许用 run_i2v_workflow.py / run_batch.py 两个入口，参数白名单，禁止写新脚本/编造参数/换主题/手写轮询，先 --check 后提交，失败不重试写 issues 上报。违反任一条 = 违规 = 停止并上报 DeepSeek。
user-invocable: true
---

# 9B RH 执行规范（无漂移宪章）

> 核心：RH API 是最简单的机械程序，**不需要创造，只需要照做**。

## 1. 唯一入口（只准这两个，禁止写新脚本）

```bash
cd "<RH_Workflow_Api 脚本目录>"   # 台式机示例：E:\Harness Workspace\Local_LLM\RH_Workflow_Api
python run_i2v_workflow.py ...          # 单任务
python batch\run_batch.py --csv ...     # 批量
```

## 2. 参数白名单（run_i2v_workflow.py）

`--image` `--prompt` / `--prompt-file` `--duration` `--resize-max 1280`（必带） `--output-dir` `--json` `--check` `--image-name`
不存在：`--submit` `--task_id` `--first_frame_path` 等——argparse 没有就是没有。

## 3. 流程铁律

1. 先 `--check`（免费自检）
2. `--resize-max 1280`：参考图**绝不裁剪**只缩放
3. 提交（= 花钱，参数核对三遍）
4. 轮询/下载交给脚本或 `run_workflow_api.RunningHubClient`——**禁止手写轮询**（有 float 格式化崩溃前科）

## 4. 提示词铁律

开头必写：`第0帧起画面即为动态场景，禁止参考图版面/三视图/多视角面板/文字/白底站姿停留，人物从第一帧起连续运动`。结构：人物锁定→场景→动作（进行时）→运镜→风格。

## 5. 失败协议

报错→不重试→写 `batch\issues\<id>.md`→等 DeepSeek 诊断。一次性偶发（VRAM）最多重试 1 次。

## 6. 状态查询

只信 API（`POST /openapi/v2/query`）；网页工作台滞后属正常，不误判卡住。

## 7. 漂移违规清单（命中即停）

自己写新脚本 / 编造参数 / 换主题（橘猫事件）/ 改 Linux 路径 / 手写轮询 / 乱加 usePersonalQueue / 跳过 --check。
