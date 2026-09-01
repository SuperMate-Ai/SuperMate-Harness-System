# Supermate（自有插件）— SuperMate Harness System

> 本目录为 **SuperMate 自研插件**的存放位置（区别于 `DSH Official/` 的官方插件）。
> 开源适配/示例放本目录；核心商业增强不公开。

## 已开源插件

| 插件 | 状态 | 说明 |
|------|------|------|
| [**skill-json-importer**](skill-json-importer.ts) | ✅ 已开源 | `.skill.json` → DSH 原生 skill 导入器：解析校验（skillMeta/execute）→ 转换为 `.dsh/skills/<kebab>/SKILL.md`（frontmatter + 工作流程正文），skill-filesystem watcher 实时发现。三个工具：`import_skill_json` / `scan_skill_json` / `import_all_skill_jsons`；开机扫描 + 实时监视 `<DSH_HOME>/skill-imports/`（drop-in 即导入、编辑即更新、幂等） |
| [**context-handoff-auto**](context-handoff-auto/) | ✅ 可用 | 128k 本地模型上下文自动备份（对齐 DSH compaction，防摘要丢细节） |

## 规划中的自研插件（闭源商业层核心，不在本仓库公开）

| 插件 | 状态 | 说明 |
|------|------|------|
| 资源调度 | 🔜 规划 | 多模型资源错峰调度（专利方向 P1） |
| 记忆治理 | 🔜 规划 | 记忆分级/置信度/回滚/审计（专利方向 P3） |
| 沙箱 | 🔜 规划 | 插件隔离/权限分级/审计日志 |
| 评测（Eval） | 🔜 规划 | 任务 trace/失败归因/技能测试集 |

> 说明：以上核心增强实现**不随本仓库开源**（见根目录《双许可说明.md》）；本目录开源部分仅放可公开的适配/示例。
