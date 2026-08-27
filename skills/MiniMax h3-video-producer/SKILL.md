---
name: h3-video-producer
description: 用本地 ComfyUI 的 MiniMax H3 工作流从零生产完整视频（口播/科普/产品演示/教学），无需任何云端视频 API。流程：接收视频需求 → 写文案与分镜（三模式：全屏主持人/小头像/纯画外音）→ 按 h3-prompt-writing 规范生成 H3 分段提示词 → 本地 ComfyUI 逐段生成（链式衔接+智子等角色身份锚定+尾帧质检+卸载视觉模型）→ ffmpeg 合成（硬切、正圆羽化小窗、图表缓慢推镜、白字字幕+核心词黄高亮、BGM 避让、结尾淡出）→ 校验交付。Use when the user wants to make a video with the local H3 pipeline (e.g. "用本地 H3 做个口播视频", "做科普视频", "视频分镜合成").
---

# h3-video-producer — 本地 H3 完整视频生产 Skill（pexo 本地版）
[![MiniMax H3](https://img.shields.io/badge/MiniMax-H3-purple)](https://github.com/topics/minimax-h3)
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)

把 pexo 式"一句话需求 → 成品视频"的完整生产流程，改为**纯本地 MiniMax H3（ComfyUI 工作流）**驱动，全程不调用任何云端视频 API。

## 前置环境（使用前必须确认）

1. **ComfyUI 在运行**：`http://127.0.0.1:8188`，且 H3 工作流可用（`Supermate-MiniMax H3 图生视频 DSH 测试.json`，节点 94=LoadImage 参考图 / 95=Text 提示词 / 20=时长 / 44=分辨率 / 3=种子）。
2. **角色参考图**：主讲人形象图（如智子 `zhizi-portrait.png`）用于 ref_image_0/身份锚定。
3. **机器约束（铁律）**：RTX 5080 16GB + ~32GB RAM 级别。**ComfyUI 生成期间绝不调用 Ollama 视觉分析；视觉分析只在队列完全空闲时进行**，分析后立即卸载视觉模型（keep_alive=0）。逐条生成、逐条质检，任何时刻只有一个模型占算力。
4. **素材**：主画面展示用图表/界面图（可用 ECharts/SVG/System.Drawing 等生成后转 PNG）。

## 生产流程（六步）

### ⛔ 生成门禁（最高优先级，先于一切步骤）
**所有视频项目必须先出具体方案（剧本/分镜/台词逐字稿），提交用户检查确认；用户明确批准后，才允许进入任何生成环节（H3/Z-Image/合成）。未批准不得生成。**
理由：未经确认直接生成 = 废片成堆 + 时间与 token 成本失控。
- 交付方案时：只给分镜表 + 台词 + 素材清单 + 时长（简版，不展开长篇）。
- 用户批准后才执行第 3 步及之后。
- 重活（轮询/日志/下载/合成/校验）一律脚本内完成，只回传一行摘要，不把大段日志/输出拉进对话。

### 1. 文案与分镜
- 依据用户需求写口播稿（语速按需，参考 270-300 字/分钟；冷静干货/活泼均可，写进提示词）。
- 用 `references/storyboard-template.md` 把视频切成块（开场/正文/结尾），每块标注：模式、时长、主画面素材、台词。

## 通用本地模型执行规范（任何模型照单操作，勿依赖模型背景知识）

本技能面向通用/本地模型（含 Ollama 等小模型）设计。执行时严格照抄以下清单，按顺序做，不跳步：

1. **固定事实（写死，不靠猜）**：ComfyUI = `http://127.0.0.1:8188`；工作流 JSON、角色肖像、素材 PNG 的具体路径一律见各脚本顶部 CONFIG；脚本用 `node <文件>.mjs` 运行。
2. **执行顺序（固定 8 步）**：
   ① 出方案（分镜表+台词逐字+素材+时长）→ ② 提交用户，**确认后才继续** → ③ 写提示词到 `prompts/<seg>.txt`（台词用 `<d>[Chinese]...` 逐字保留）→ ④ 编辑 `references/segment-generate.mjs` 的 CONFIG（segments/prompts 目录/portrait）→ ⑤ `node segment-generate.mjs` → ⑥ 编辑 `references/compose-final.mjs` 的 CONFIG（blocks/dialogue/highlight）→ ⑦ `node compose-final.mjs` → ⑧ `ffprobe` 校验成片时长与音视频流。
3. **每步后校验点**：提示词内台词与 dialogue/ 逐字一致；每段 `segments/<seg>/<seg>.mp4` 存在且含 `qa-pass.txt`；成片时长 ≈ 各块时长之和 ±0.5s；音轨存在（aac）。
4. **出错处理**：段失败 → 看项目根 `run.log` 尾部定位；ComfyUI 不可达 → 重启服务再试；卡死超时 → 按 45 分钟上限报错并停；**生成门禁未获批准 → 不得进入任何生成**。
5. **机器铁律**：ComfyUI 生成期间不跑 Ollama 视觉分析；视觉分析只在队列空闲时进行并随后卸载模型；一切重活（轮询/下载/合成/校验）由脚本完成，只回传一行摘要。
- 分镜时长规则：开场 3-6s 全屏；正文普通讲解 6-9s；图表/原理特写 7-10s 纯画外音；结尾 3s 全屏。**禁止统一强制 10s**。

### 2. H3 分段提示词
- 按 `h3-prompt-writing` 规范 + `references/h3-prompt-modes.md` 的三模式模板写每段提示词。
- 台词用 `<d>[Chinese] ...</d>` 原样保留，逐字与口播稿一致；语速/人声/口型同步/禁即兴写进描述。
- 角色一致性：全片共用同一角色参考图；正文小窗段注明"视线朝向画面右侧"。

### 3. 本地逐段生成
- 运行 `references/segment-generate.mjs`（配置：输出目录、角色参考图、每段提示词与时长、工作流路径）。
- 内置：首段用角色肖像，后续段链式衔接（前段尾帧作 ref_image_0）+ 身份锚定（角色肖像作 ref_image_1）；逐段尾帧质检（Ollama，仅队列空闲时）+ 卸载视觉模型；质检不过换种子重试。

### 4. 合成
- 运行 `references/compose-final.mjs`（配置：块列表 = 段 + 模式 + 主画面素材 + 裁剪）。
- 三模式：`full` 全屏主持人 / `pip` 主画面+左下角正圆羽化小窗（尺寸=画面 1/6~1/7、只露脸+肩颈、视线朝右）/ `vo` 纯画外音（图表缓慢推镜 zoompan、无任何人物、字幕保留）。
- 全部硬切；字幕 ASS 白字+核心词黄高亮+按标点硬换行避让小窗；BGM 低音量恒定、说话时避让；结尾淡出+音频限幅。

### 5. 校验
- 时长/音视频流校验（ffprobe）；抽帧视觉校验（仅 ComfyUI 空闲时）：主画面无人物半身像、小窗正圆完整脸部、纯画外音段无人物、字幕不遮挡。

### 6. 交付
- 输出成片 + 分段底稿（同目录保留）+ 提示词/台词/日志。

## 硬性规范（沿用秋芝2046 风格模板）

1. 正文技术画面**禁止**主屏出现主持人大图，禁止小头像+主人物同框。
2. 小头像禁止放大为半身照，禁止直视镜头（必须看向画面右侧），禁止静态图（须口型/眨眼/微小动作）。
3. 图表/原理/数据段**优先纯画外音**（完全移除人物，人声保留为旁白）。
4. 运镜只用：静态固定、缓慢推镜（图表特写）、极慢横移（宽表格）、微小缩放；禁止甩镜/旋转/剧烈推拉。
5. 特效只允许：高亮框闪烁、箭头流动、数字滚动、文字逐行浮现、点击反馈；禁止粒子/霓虹/爆炸/花字。
6. 图表风格：扁平 2D、低饱和蓝灰黑白科技配色，拒绝 3D/渐变炫光/卡通插画。

## 关联
- 提示词结构：见 `h3-prompt-writing` 技能。
- 运行脚本：`references/segment-generate.mjs`、`references/compose-final.mjs`。
- 分镜模板：`references/storyboard-template.md`；三模式提示词模板：`references/h3-prompt-modes.md`。
