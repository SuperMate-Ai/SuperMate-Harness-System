# h3-video-producer — 本地 MiniMax H3 视频生产 Skill
[![MiniMax H3](https://img.shields.io/badge/MiniMax-H3-purple)](https://github.com/topics/minimax-h3)
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)

pexo 本地版：把"一句话需求 → 成品视频"的完整生产流程改为**纯本地 ComfyUI MiniMax H3 工作流**驱动，不调用任何云端视频 API。

## 能力
- 三模式出镜：全屏主持人 / 左下角正圆羽化小窗（视线朝右）/ 纯画外音（图表特写无人物）
- 本地生成：H3 图生视频 + 链式衔接 + 角色身份锚定 + 尾帧质检（资源错峰）
- 专业合成：硬切、图表缓慢推镜、字幕黄高亮、BGM 避让、结尾淡出、音频限幅
- 零云端

## 使用
1. ComfyUI 运行中 + H3 工作流 + 角色参考图 + 素材 PNG
2. `references/storyboard-template.md` 写分镜
3. `references/h3-prompt-modes.md` 写分段提示词
4. `node references/segment-generate.mjs`（改 CONFIG）→ 本地生成各段
5. `node references/compose-final.mjs`（改 CONFIG）→ 合成成片

## 铁律
生成期间不跑视觉分析；逐条生成→质检→卸载模型。
