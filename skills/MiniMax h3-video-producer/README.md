# h3-video-producer — 本地 MiniMax H3 完整视频生产 Skill
[![MiniMax H3](https://img.shields.io/badge/MiniMax-H3-purple)](https://github.com/topics/minimax-h3)
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)

**pexo 本地版**：把"一句话需求 → 成品视频"的完整生产流程，改为**纯本地 ComfyUI MiniMax H3 工作流**驱动，不调用任何云端视频 API。

**给文本模型做视频**：写文案分镜 → 生成 H3 分段提示词 → 本地逐段生成（链式衔接 + 角色身份锚定 + 尾帧质检）→ ffmpeg 合成（三模式、硬切、字幕黄高亮、BGM、淡出）→ 校验交付。

## 能力
- **三模式出镜**：全屏主持人（开场/结尾）/ 左下角正圆羽化小窗（正文讲解软件界面，视线朝右）/ 纯画外音（图表特写、原理数据段，完全无人物）
- **本地生成**：ComfyUI H3 图生视频工作流；链式衔接（前段尾帧）+ 角色肖像身份锚定；逐段尾帧质检并卸载视觉模型（资源错峰）
- **专业合成**：硬切、图表缓慢推镜、ASS 字幕（白字+核心词黄高亮+硬换行避让）、BGM 避让、结尾淡出、音频限幅
- **零云端**：全程本地（ComfyUI + ffmpeg + Ollama 质检）

## 使用
```text
1. 准备：ComfyUI 运行中 + H3 工作流 + 角色参考图 + 主画面素材 PNG
2. 按 references/storyboard-template.md 写分镜
3. 按 references/h3-prompt-modes.md 写每段提示词（台词逐字存 dialogue/）
4. 编辑 references/segment-generate.mjs 的 CONFIG → node segment-generate.mjs
5. 编辑 references/compose-final.mjs 的 CONFIG → node compose-final.mjs
```

## 机器约束（铁律）
RTX 5080 16GB + ~32GB RAM 级别：**ComfyUI 生成期间绝不调用 Ollama 视觉分析**；逐条生成、逐条质检、卸载模型；任何时刻只有一个模型占算力。

## 文档
- `SKILL.md` — 完整工作流指令
- `references/storyboard-template.md` — 分镜模板（三模式、时长规则）
- `references/h3-prompt-modes.md` — 三模式 H3 提示词模板
- `references/segment-generate.mjs` — 本地分段生成器
- `references/compose-final.mjs` — 成片合成器

中文说明见 `README-cn.md`。
