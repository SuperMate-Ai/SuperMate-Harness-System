---
name: rh-workflow
description: RunningHub（RH）工作流 API 调用——通过 ComfyUI 工作流跑 MiniMax H3 图生视频等任务。当用户提到 RunningHub/RH API、H3 工作流、图生视频、三视图首帧、跑 RH 脚本、或需要把参考图变成视频时使用。核心铁律：参考图绝不裁剪，只缩放到最长边 1280px；提示词充分信任 H3 理解力、写具体剧情与运镜。脚本位于 Local_LLM/RH_Workflow_Api/。
user-invocable: true
---

# RH 工作流（RunningHub ComfyUI 工作流 API）

> 在终端/脚本里直接跑 RunningHub 的 ComfyUI 工作流：上传首帧图 → 提交任务 → 轮询 → 下载成片。
> 实测打通：MiniMax H3 I2V 图生视频（workflow `2085953821150367746`，9:16 / 24fps / 带音频）。

## 资料库与提示词库（写提示词前先查）

本地大模型工作区（Local_LLM）可直接访问两类知识源（已建 junction 直达）：

| 资源 | 路径（Local_LLM 内直达） | 内容 |
|------|--------------------------|------|
| Obsidian 资料库 | `Local_LLM\Vault`（= `E:\Harness Workspace\Harness`） | `MEMORY.md`/`USER.md`、项目复盘、`超级提示词库.md`、`手动记录 H3 提示词.md`、`原创提示词.md`、`vlogprompt 提示词库（X 源）`、导演技能等 |
| 提示词库 | `Local_LLM\提示词库`（= `E:\Harness Workspace\超级提示词库`） | higgsfield 社区技能集（cinema/acting/camera 等）、picx 模板分卷（**`picx\picx-分卷\minimax-h3.md`**、kling/seedance/seedream 等）、youmind Seedance 全量提示词 |

**写 H3 提示词前必查**：
1. `提示词库\picx\picx-分卷\minimax-h3.md` —— H3 模板结构（主体→场景→风格→运镜→时间线→音频→目标）
2. `Vault\手动记录 H3 提示词.md` / `Vault\超级提示词库.md` —— 本地沉淀的 H3 实战提示词
3. 需要炫酷剧情时参考 higgsfield 模板：`提示词库\higgsfield\community-osidemedia\templates\`（01 动作追逐、05 科幻 VFX、06 角色出场等）

## 脚本位置

```
本技能自带全部脚本（本仓库 `references/` 内，可 clone 即用；本机安装位置 `E:\Harness Workspace\Local_LLM\RH_Workflow_Api\`）：
├── run_workflow_api.py       # 客户端库 RunningHubClient（上传/提交/轮询/下载）
├── run_i2v_workflow.py       # 主入口 CLI（--image / --prompt / --duration / --resize-max / --image-name / --json / --check）
├── run_i2v_10s.py            # 10 秒示例
├── run_i2v_10s_full.py       # 10 秒完整版示例
├── run_t8_battle.py          # MiniMax H3 T8 高级工作流示例（stable_4v4a）
├── RH_API_README.md          # API 契约速查（端点/nodeInfoList/踩坑）
└── 9B执行规范.md              # 9B 无漂移执行宪章（RH 通道执行器必读）
```

API Key 自动读取：`--api-key` 参数 > `RUNNINGHUB_API_KEY` 环境变量 > `Local_LLM/Api_key.txt`。

## 铁律 1：首帧图用 Resize 方案，绝不裁剪 ✂️❌

**参考图（人物三视图/全身图等）上传前：**

- ❌ **绝不裁剪**。裁剪会切掉人物（头/脚/鞋尖），破坏形象完整性——三视图里的文字、多视角面板**不能裁**，那是给模型看的形象信息。
- ✅ **只缩放**：把图片最长边缩放到 **1280px**（保持比例、不裁剪、Pillow LANCZOS），与视频生成最长边（1280）对齐。
  - 省大量 CLIP token（5404×3040 的 7MB 大图 vs 1280×720 的 0.7MB）
  - 避免超清大图被模型压缩时的变形/伪影
  - 三视图作为形象参考会被 H3 自动"消化"：实测视频第 0.5s 就已进入剧情场景，不会停留在参考图版面

```bash
python run_i2v_workflow.py --image 参考图.png --resize-max 1280 --prompt "..." --duration 5
```

## 铁律 2：提示词充分信任 H3，写具体剧情 🎬

- H3 的 CLIP 是 qwen3vl 系，**中文理解力强**，放心写中文。
- 结构参考（提示词库 picx/minimax-h3 模板）：**人物锁定 → 场景 → 动作 → 运镜 → 风格 → 时长**。
- 参考图负责锁身份（发型/服装/气质在提示词里再复述一遍），剧情部分要具体、有画面感、炫酷：
  - 场景可"炸裂切换"：纯白空间 → 赛博朋克雨夜天台/霓虹街道
  - 动作要有行为：迈步走向镜头、抬眼凌厉直视、甩马尾、抬手
  - 运镜写清楚：低角度推近、跟拍、慢镜头
  - 氛围词：霓虹灯牌、雨幕、狂风卷衣角、电影级暗蓝青调色

**开场动态铁律（I2VA 特性）**：
- H3 I2VA 的首帧图会作为**字面第一帧停留约 0.5~1 秒**才进入运动（"照片→表演"停顿）。
- 提示词**开头第一句**必须显式声明动态起始，例如：
  `第0帧起画面即处于运动中，禁止静态开场、禁止参考图停留、全程连续运动无停顿`
- 开头动词全部用**进行时动作**（后跃/转身/挥剑/疾走），不要写"站立/看向镜头/平静"等静态描述。
- 时间线从 0s 就开始动作；若需根治，改走 H3 Ref2VA/FL2VA 模式（参考图锁身份但不作字面首帧）。

实测示例（5s，效果优秀）：
```
参考图中这位年轻职场女性（黑色高马尾、白色翻领衬衫、浅灰色修身牛仔裤、黑色尖头鞋，清冷知性气质）为唯一主角。
开场即高能：她立于纯白空间，下一秒场景猛然炸裂切换——午夜赛博朋克都市天台，霓虹灯牌在倾盆雨幕中闪烁，狂风卷起她的高马尾和衬衫衣角。
她缓缓抬起下巴，眼神凌厉如刀直视镜头，嘴角勾起一抹自信冷笑，随即迈开长腿迎着镜头大步走来。
雨滴在霓虹光中飞溅成珠，身后城市灯火拉出流动光轨，发丝与雨丝在慢镜头中飞扬。
镜头低角度缓缓推近，紧跟她冷冽的步伐，电影级暗蓝青霓虹调色，赛博金属质感，全程5秒一气呵成的酷飒登场。
```

## 命令速查

```bash
cd "E:\Harness Workspace\Local_LLM\RH_Workflow_Api"

# 免费自检（Key + 工作流节点核对，不花钱）
python run_i2v_workflow.py --check

# 标准流程：Resize → 上传 → 提交 → 轮询 → 下载
python run_i2v_workflow.py \
  --image 参考图.png --resize-max 1280 \
  --prompt "你的炫酷提示词" --duration 5 \
  --output-dir ./output --json

# 复用已上传图片（库中保留约1天，跳过上传）
python run_i2v_workflow.py --image-name openapi/xxx.png --prompt "..." --duration 5

# 超长提示词用文件
python run_i2v_workflow.py --prompt-file ./prompt.txt --duration 5
```

## API 契约（官方文档核对，勿再踩坑）

| 步骤 | 端点 | 要点 |
|------|------|------|
| 上传 | `POST /openapi/v2/media/upload/binary` | Bearer 鉴权，multipart `file`；返回 `data.fileName`（服务端路径）+ `data.download_url` |
| 提交 | `POST /task/openapi/create` | Body：`{apiKey, workflowId, nodeInfoList, addMetadata?}`；返回 `data.taskId` |
| 轮询 | `POST /openapi/v2/query` | Body：`{taskId}`；`status` ∈ QUEUED/RUNNING/SUCCESS/FAILED；成功带 `results[].url` |
| 取消 | `POST /task/openapi/cancel` | Body：`{apiKey, taskId}` |
| 余额 | `POST /uc/openapi/accountStatus` | Body：`{apikey}`（免费） |
| 节点核对 | `POST /api/openapi/getJsonApiFormat` | Body：`{apiKey, workflowId}` → 返回工作流当前节点结构 |

**nodeInfoList 格式**（旧版踩坑点）：

```json
[{"nodeId": "43", "fieldName": "text",  "fieldValue": "提示词"},
 {"nodeId": "20", "fieldName": "value", "fieldValue": 5},
 {"nodeId": "47", "fieldName": "image", "fieldValue": "openapi/xxx.png"}]
```

- 图片节点 `fieldValue` 用上传返回的 **fileName**（不是 URL，除非节点是 LoadImageFromUrl）。
- 提交端点**不是** `/openapi/v2/run/workflow/{id}`（不存在）；`workflowId` 放 body，不放 URL。
- **不要给请求全局设 `Host` 头**：API 请求 requests 会自动带对；但下载结果时 URL 是 COS 存储，带错 Host 会 400（实测踩坑）。

## 工作流节点（MiniMax H3 I2V 1280 加速，已用 getJsonApiFormat 核对）

| Node | class | fieldName | 说明 |
|------|-------|-----------|------|
| 43 | Text | text | 提示词 |
| 20 | PrimitiveFloat | value | 时长（秒，float） |
| 47 | LoadImage | image | 首帧图 fileName |

## 实测记录（2026-08-22）

- 10s 情感版（原图直接上传）：成功，但 16:9 三视图直接当首帧 → 人物被压缩变形 → 引出 Resize 方案。
- 5s 炫酷版（`--resize-max 1280` + 赛博朋克剧情）：**成功**，0.5s 即进入场景，人物一致无变形，画质优秀。
- **标准实例可跑**（默认实例偶发 VRAM grow failed，重试即可）；**不要默认用 `--instance-type plus`**（plus 队列资源少会长时间排队占住名额，导致后续任务 `TASK_QUEUE_MAXED`）。
- 花费参考：5s 视频约 67 金币（余额 ¥ 几乎不动）。

## ⏱️ 生成时间与检查节奏（2026-08-25 经验）

**不同时长视频的生成时间不同，轮询/重试间隔要匹配，且留好资源响应新问题（勿频繁阻塞）**：

| 视频时长 | 预计生成时间 | 建议检查间隔 |
|---|---|---|
| 10s | ~5 分钟 | 6 分钟 |
| 15s | 8-10 分钟 | 8-10 分钟 |
| **Director 导演台（双采样，任意时长）** | **~15 分钟** | **15 分钟** |
| **Director + 放大（1K）单段 10s** | **~11 分钟**（采样3 + 放大5 + 精修3）| 12-15 分钟 |

**放大档位是时间/显存大头**：
- 2K 放大单帧成本是 1K 的 2-4 倍 → 长时间占实例 → 队列 TASK_QUEUE_MAXED、显存不足失败（台式机 30s+2K 放大失败的根因）
- **先用 1K 打通流程**（单段 10s ≈ 11 分钟：8步采样3 + 放大5 + 精修3），画质确认后再按需升档
- 30s 全片估算 ≈ 3 段 × 11 分钟 ≈ 33 分钟（逐段跑再拼接）

- `TASK_QUEUE_MAXED` = 同实例队列被占（可能自己的任务还在跑）→ 按上表间隔重试提交即可，不用频繁试探
- 长任务（30s+/Director）用后台任务监控，前台保持可响应
