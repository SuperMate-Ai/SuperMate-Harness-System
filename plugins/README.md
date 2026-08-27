# 插件层（Plugins）— SuperMate Harness System
[![DSH Plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)

> 插件 = 提供"能力"的系统组件（可自由替换、灵活重组，一切皆插件）。
> 与 Skill 层（教"怎么做"）不同，插件层提供"能做什么"的执行能力。

## 结构

```
SuperMate Harness System
 ├── skills/   → Skill 层（任务级：技能/指令/流程清单）
 └── plugins/  → 插件层（系统级）
      ├── Supermate/             自研插件（规划中，核心增强闭源商业层）
      ├── DSH Official/          官方基本插件索引（deepseek-ai，只选官方）
      └── README.md              插件清单（模型/记忆/调度/工具/沙箱/评测/UI）
```

## 官方插件索引
[官方基本插件（deepseek-ai/deepseek-harness，只选官方）](DSH%20Official/README.md)

## 自研插件目录
[Supermate 自有插件（未来开发的插件放这里）](Supermate/README.md)

## 插件清单（现状与规划）

| 插件 | 现状 | 位置/说明 |
|------|------|-----------|
| **模型适配** | ✅ 可用 | 云端 DeepSeek（当前主脑）+ 本地 Ollama（视觉/未来主脑） |
| **记忆** | ✅ 可用 | Obsidian vault + Hermes 记忆协议（MEMORY.md/USER.md） |
| **调度** | ✅ 可用（技能脚本内） | 资源错峰：生成/质检互斥、逐条卸载模型（见 h3-video-producer） |
| **工具** | ✅ 可用 | ComfyUI（H3/Z-Image）、ffmpeg、Ollama、GitHub、System.Drawing |
| **沙箱** | 🔜 规划 | 插件隔离、权限分级、高危二次确认、审计日志 |
| **评测** | 🔜 规划 | 任务 trace/失败归因/技能测试集/模型适配评分 |
| **UI** | 🔜 规划 | 未来接入（DSH 插件化 UI） |

## 说明
- 插件资产 = 适配脚本、工作流、接口规范、调度/治理实现。
- **核心闭源商业层**（高级调度/记忆治理/沙箱/评测实现）不随本仓库开源，见根目录《双许可说明.md》。
- 开源插件示例与适配脚本可直接使用/修改（Apache-2.0）。
