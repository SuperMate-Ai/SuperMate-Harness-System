# Skill 层（Skills）— SuperMate Harness System

> Skill = 教"怎么做"的任务级技能（SKILL.md 结构化指令/流程清单）。
> 与插件层（提供"能做什么"的执行能力）不同，Skill 层解决"怎么做"。

## 结构

```
SuperMate Harness System
 ├── skills/                        → Skill 层（任务级）
 │    ├── Deepseek-eyes/             视觉 skill（Ollama）
 │    ├── MiniMax h3-video-producer/
 │    ├── Supermate/
 │    └── DSH Official/              官方基础技能（deepseek-ai，13 个，只选官方）
 └── plugins/                        → 插件层（系统级）
      ├── Supermate/                 自研插件（规划中，核心增强闭源商业层）
      ├── DSH Official/              官方基本插件（deepseek-ai，49 族，fork 拷贝）
      └── README.md                  插件清单（模型/记忆/调度/工具/沙箱/评测/UI）
```

## 技能清单（现状与规划）

| 技能 | 现状 | 说明 |
|------|------|------|
| **Deepseek-eyes** | ✅ 已发布 | 视觉 skill（Ollama）：看图/资产入库/提示词管理 |
| **MiniMax h3-video-producer** | ✅ 已发布 | 本地版完整视频生产（H3/Z-Image + 生成门禁） |
| **Supermate 身份** | ✅ 已发布 | 智能体身份（能力矩阵/插件调用协议/复盘模板），见 [SKILL.md](SKILL.md) |
| **DSH Official（官方 13 个）** | ✅ 已入库 | [DSH Official/README.md](DSH%20Official/README.md)，Apache-2.0 原样复制，见 [NOTICE](DSH%20Official/NOTICE.md) |
| **rh-workflow** | ✅ 已发布 | RunningHub 工作流 API（MiniMax H3 I2V/Ref2VA/T8）：客户端+CLI+契约+铁律，见 [rh-workflow/SKILL.md](rh-workflow/SKILL.md) |
| **rh-workflow-9b** | ✅ 已发布 | 9B 无漂移执行宪章（RH 通道执行器行为准则），见 [rh-workflow-9b/SKILL.md](rh-workflow-9b/SKILL.md) |
| **video-production-studio** | ✅ 已发布 | 通用视频制作流水线（短剧/漫剧/口播/广告/MV）：五文档 + 确认闸门 + H3 原生提示词 + 本地通道接线，见 [SKILL.md](video-production-studio/SKILL.md) |
| **lyric-mv-storyboard** | ✅ 已发布 | 歌词驱动 MV 分镜生成器（LRC 时间轴/三层表演体系/防变脸/Ref2VA 演唱提示词），见 [SKILL.md](lyric-mv-storyboard/SKILL.md)；便携 skill.json 源见 [json/](lyric-mv-storyboard/json/) |

## 说明
- Skill 资产 = SKILL.md + 参考文档/脚本/模板（任务级，可独立安装/替换）。
- 官方技能 Apache 风格开源，可直接复用；SuperMate 核心增强属闭源商业层，见根目录《双许可说明.md》。
