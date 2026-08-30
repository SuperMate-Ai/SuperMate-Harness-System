# 本地生产通道接线（harness-channels.md）

生产阶段把 `图片提示词.md` / `视频提示词.md` 的可复制正文送到对应通道。所有通道的公共铁律：
**先预览、再确认、后执行**；参考图只缩放不裁剪；凭据不进项目文件；一个 job 一种 modality。

## 1. 图片：ComfyUI Z-Image（`comfyui_generate` 工具）

| 项 | 值 |
|---|---|
| 入口 | 本会话工具 `comfyui_generate`（ComfyUI 127.0.0.1:8188） |
| 模型 | Z-Image Turbo nvfp4，CLIP = qwen_3_4b（中英文提示词均可） |
| 默认参数 | 宽 720 × 高 1280（9:16 竖屏）；steps 8；cfg 1；shift 3；lora_strength 0.95（Kook 真实幻想 Turbo） |
| 负面提示词 | 缺省 `blurry ugly bad` |
| 可复现 | 同参数同 seed 复现；生成后记录 seed 便于归档 |
| 提示词要求 | 纯文本，不要 JSON/Markdown 结构；一条 prompt 一个画面目标 |

用法：把 `图片提示词.md` 中 `IMG-*` 条目的「可复制提示词」正文传给 `prompt` 参数；
竖屏默认即可，横屏/方形显式传 width/height（自动取 16 的倍数，范围 256–2048）。
结果下载到 `comfyui-out/`，复制进 `剧集/<EP>/制作成果/`。

## 2. 图生视频：RunningHub H3（`rh-workflow` 技能）

脚本目录：`E:\Harness Workspace\Local_LLM\RH_Workflow_Api\`；先 `python run_i2v_workflow.py --check` 免费自检。

| 工作流 | ID | 比例 | 用途 |
|---|---|---|---|
| MiniMax H3 **I2V** 1280 | `2085953821150367746` | 9:16 竖屏 | 单参考图作字面首帧；首帧图会停留约 0.5–1s |
| MiniMax H3 **Ref2VA** | `2085980820623413250` | 16:9 横屏 | 参考图锁身份但**不作字面首帧**；跨集/多参考/品牌向首选 |
| MiniMax H3 **T8**（LLM 自动写提示词） | `2089691196661780481` | 3:4 | 高级版，一般不用 |

调用（`--prompt` 直接放 H3 提示词正文，长文用 `--prompt-file`）：

```bash
cd "E:\Harness Workspace\Local_LLM\RH_Workflow_Api"
python run_i2v_workflow.py --workflow-id 2085980820623413250 --image 首帧.png --resize-max 1280 --prompt "<H3正文>" --duration 10 --output-dir ./output --json
```

**铁律**：
- 参考图（三视图/全身图等）**绝不裁剪**，只把最长边缩放到 1280px（`--resize-max 1280`，Pillow LANCZOS）。
- 比例由工作流锁定，**不要**用 API 覆盖 aspect_ratio（会被拒 [805]）。
- I2V 提示词**第一句**声明运动起点：`第0帧起画面即处于运动中，禁止静态开场、禁止参考图停留`；
  开头动词用进行时动作（后跃/转身/挥剑/疾走）。
- 节点：43=提示词(Text)，20=时长(PrimitiveFloat)，47=首帧图(LoadImage)。
- 提示词充分信任 H3（qwen3vl 系 CLIP，中文理解力强）；写具体剧情与运镜，参考图负责锁身份，
  提示词里再复述一遍发型/服装/气质。
- 默认实例可跑；不要默认 `--instance-type plus`（排队占名额）；失败重试仍须新确认。
- 花费参考：5s ≈ 67 金币。

## 3. 文生视频：豆包 Seedance 2.0（`doubao-creator` 技能）

| 项 | 值 |
|---|---|
| 入口 | `node "<skill>\scripts\doubao-genvideo-text.js" "<需求>"`（夸克调试模式 + doubao.com 登录态） |
| 能力 | 文生视频（Seedance 2.0，10s 竖屏等）；非人脸图可图生视频 |
| 限制 | **不支持上传真实人脸参考图**（肖像保护会拒绝） |

**人物形象破局法**：先 `doubao-vision.js` 让豆包看图反推精确文字描述 → 把描述写进文生视频提示词
（写实真人+发色+发型+服装+气质，越具体越像）→ Seedance 按文字生成近似形象。
下载带 `Referer: https://www.doubao.com/` 头；生成预计 5 分钟（脚本最长轮询 10 分钟）；
"出于肖像保护"等短语出现且发送后至少等 30 秒再判定拒绝。

## 4. 口播/讲解：本地 ComfyUI H3 分段（`h3-video-producer` 技能）

三模式：`full` 全屏主持人 / `pip` 主画面+左下角正圆羽化小窗（露脸+肩颈、视线朝画面右侧）/ `vo` 纯画外音（图表缓慢推镜）。
流程：出方案（分镜表+台词逐字稿+素材+时长）→ 用户确认 → 写提示词 `prompts/<seg>.txt`
（台词 `<d>[Chinese]...` 逐字保留）→ `node references/segment-generate.mjs`（首段角色肖像，
后续段链式衔接前段尾帧 + 身份锚定）→ `node references/compose-final.mjs` → ffprobe 校验。
**机器铁律**：ComfyUI 生成期间绝不跑 Ollama 视觉分析；质检只在队列空闲时进行并随后卸载视觉模型。

## 5. 质检：Ollama 视觉（`analyze_image` 工具）

- 只审：角色一致性（是否同一人）、构图与动作是否命中提示词、口型/手指/遮挡/伪影、字幕遮挡等。
- 仅在 ComfyUI 队列完全空闲时执行；分析后立即卸载视觉模型（keep_alive=0）。
- 质检不过 → 换种子/改局部提示词重跑（重跑 = 新确认）。

## 6. 合成：ffmpeg（pwsh）

- 硬切为主；字幕用 ASS（白字+核心词黄高亮，按标点硬换行避让小窗）；BGM 低音量恒定、说话时避让；结尾淡出+音频限幅。
- 常用：`ffmpeg -i seg.mp4 -c copy out.mp4`（拼接）、`-vf subtitles=...`（烧字幕）、
  `-filter_complex`（PIP/画中画）、`-af sidechaincompress`（对白 ducking）、`-f lavfi`（淡入淡出）。
- 交付前 `ffprobe` 校验时长 ≈ 各段之和 ±0.5s，音轨存在（aac）。

## 7. 通道选择速查

| 情形 | 通道 |
|---|---|
| 角色板/场景板/道具板/风格帧 | Z-Image |
| 16:9 剧情视频，有角色/场景参考图要锁身份 | RH Ref2VA |
| 9:16 竖屏剧情视频，有首帧图 | RH I2V |
| 无参考图的 10s 竖屏（广告/口播/情绪片） | 豆包 Seedance 文生视频 |
| 真人脸参考 → 视频 | 豆包破局：反推文字 → 文生视频（不传人脸图） |
| 口播/科普/讲解 | 本地 H3 分段 |
| 合成/字幕/BGM/转场/校验 | ffmpeg + ffprobe |
