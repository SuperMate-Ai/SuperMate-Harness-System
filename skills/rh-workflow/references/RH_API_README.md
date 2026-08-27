# RH_Workflow_Api — RunningHub 工作流调用（MiniMax H3 I2V）

让本地大模型（如 qwen3.6）通过 RunningHub API 跑 **MiniMax H3 图生视频** 的脚本集。

## 文件

| 文件 | 作用 |
|------|------|
| `run_workflow_api.py` | 客户端库 `RunningHubClient`（上传/提交/轮询/下载，含 `--check` 免费自检） |
| `run_i2v_workflow.py` | 主入口 CLI，参数最全，支持 `--json` 机器输出 |
| `run_i2v_10s.py` | 10 秒版简化示例 |
| `run_i2v_10s_full.py` | 10 秒版完整日志示例 |
| `MiniMax H3 I2V 图生视频 1280分辨率加速工作流_api.json` | 工作流模板（导出自 RunningHub 工作台） |
| `../Api_key.txt` | API Key（自动读取） |

## 快速开始

```bash
# 1. 免费自检（验证 Key 与工作流，不花钱）
python run_i2v_workflow.py --check

# 2. 生成 10 秒视频（默认首帧图 = 天宫人物图）
python run_i2v_workflow.py

# 3. 自定义
python run_i2v_workflow.py \
  --image D:/图.png --prompt "提示词" --duration 10 \
  --output-dir ./output --json
```

## API 契约（官方文档核对，2026-04 版）

| 步骤 | 端点 | 说明 |
|------|------|------|
| 上传 | `POST /openapi/v2/media/upload/binary` | Bearer 鉴权，multipart `file`；返回 `data.fileName` 与 `data.download_url` |
| 提交 | `POST /task/openapi/create` | Body: `{apiKey, workflowId, nodeInfoList, addMetadata?}` |
| 轮询 | `POST /openapi/v2/query` | Body: `{taskId}`；`status` ∈ QUEUED/RUNNING/SUCCESS/FAILED，成功带 `results[].url` |
| 余额 | `POST /uc/openapi/accountStatus` | Body: `{apikey}`（免费） |

**nodeInfoList 格式**（重点，旧脚本写错了）：

```json
[
  {"nodeId": "43", "fieldName": "text",  "fieldValue": "提示词"},
  {"nodeId": "20", "fieldName": "value", "fieldValue": 10},
  {"nodeId": "47", "fieldName": "image", "fieldValue": "openapi/xxx.png"}
]
```

- 图片节点（LoadImage）的 `fieldValue` 用**上传返回的 `fileName`**（服务端路径），不是 URL。
- `fieldValue` 类型须与原节点一致（Float 传数字、Text 传字符串）。
- 节点 ID 与字段名以工作流 JSON 为准；本工作流：43=提示词、20=时长、47=首帧图（已用 `getJsonApiFormat` 核对）。

## 错误排查

- `AUTH_FAILED` / Key 校验失败：检查 `Api_key.txt` 或 `RUNNINGHUB_API_KEY`。
- `INSUFFICIENT_BALANCE`：余额不足，充值后重试。
- 任务 `FAILED`：`--json` 输出或轮询日志里有 `errorCode/errorMessage`；常见为提示词超长、图片格式不支持。
- 节点校验失败：提交响应 `promptTips.node_errors` 会给出具体节点，用 `run_i2v_workflow.py --check` 核对节点 ID。
