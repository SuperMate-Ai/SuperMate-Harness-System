# 官方基础技能索引（dsh-skill · 只选官方）

> 来源：**官方唯一** = [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（DSH 框架本体）。
> 本目录完整收录官方技能（SKILL.md + 配套文件），名称/功能/来源见下表；不收录第三方。

## 官方技能（两组共 13 个）

### A. DSH 仓库开发技能（`.agents/skills/`，11 个）

| 技能 | 功能 | 官方位置 |
|------|------|----------|
| `dsh-archive-agent-notes` | Agent Notes 归档/审计/修剪（保留决策史，删除失效记录） | .agents/skills/dsh-archive-agent-notes |
| `dsh-code-review` | PR 审查（对齐 AGENTS.md 规范/防御模式/ADR/质量门禁） | .agents/skills/dsh-code-review |
| `dsh-doc-site-sync` | 文档站点发布同步（仓库 Markdown 为唯一源，VitePress 投影） | .agents/skills/dsh-doc-site-sync |
| `dsh-doc-standards` | 文档标准（层级/教程与参考分离/预算/验证） | .agents/skills/dsh-doc-standards |
| `dsh-find-simplifications` | 简化候选挖掘（死代码/重复/过度构建/手写替代依赖） | .agents/skills/dsh-find-simplifications |
| `dsh-merging-stacked-prs` | GitHub 堆叠 PR 合并（原生 stack 语义，禁止手写重定基） | .agents/skills/dsh-merging-stacked-prs |
| `dsh-pre-push-checks` | 推送前最小本地检查（增量 typecheck，CI 负责全量） | .agents/skills/dsh-pre-push-checks |
| `dsh-prose-standard` | 散文/注释质量（保留契约、去除推理转录与装饰） | .agents/skills/dsh-prose-standard |
| `dsh-translate-docs` | 双语文档工作流（人工触发：简报/委派翻译/配对验证） | .agents/skills/dsh-translate-docs |
| `dsh-trim-cot-leakage` | 思维链泄漏清理（作者视角残余、变更叙述、审查答辩） | .agents/skills/dsh-trim-cot-leakage |
| `record-browser-gif` | 浏览器/GUI 演示 GIF 录制（状态帧捕获+确定性编码+证据链） | .agents/skills/record-browser-gif |

### B. Cordis 插件开发技能（`apps/cli/config/agent-presets/cordis/skills/`，2 个）

| 技能 | 功能 | 官方位置 |
|------|------|----------|
| `cordis-plugin-development` | 动态 Cordis 插件开发（Host 服务/事件/Client Slot 主题 UI/动态工具/回滚） | apps/cli/config/agent-presets/cordis/skills/cordis-plugin-development |
| `editing-cordis-compositions` | Cordis composition 编辑（agent preset/插件行/挂载诊断） | apps/cli/config/agent-presets/cordis/skills/editing-cordis-compositions |

## SuperMate Skill 层 ↔ 官方技能对应

| SuperMate Skill 层 | 对应官方技能 | 说明 |
|--------------------|--------------|------|
| 质量治理 | `dsh-code-review` · `dsh-prose-standard` · `dsh-doc-standards` · `dsh-trim-cot-leakage` · `dsh-pre-push-checks` | 代码/文档质量门禁直接复用 |
| 记忆与代码库治理 | `dsh-archive-agent-notes` · `dsh-find-simplifications` | Agent Notes 归档模型 → 记忆治理参考 |
| 文档发布（国际化） | `dsh-doc-site-sync` · `dsh-translate-docs` | 仓库唯一源 + 中英配对投影 |
| 演示/验收 | `record-browser-gif` | UI 行为演示的证据链 |
| 插件开发 | `cordis-plugin-development` · `editing-cordis-compositions` | 对齐官方 Cordis 插件生态 |

## 说明
- 以上 13 个官方技能**已完整入库**（本目录子文件夹，含 SKILL.md 与配套文件），Apache-2.0 原样复制，归属声明见 [NOTICE.md](NOTICE.md)。
- SuperMate 在其上做组装与增强；核心增强（调度/记忆治理/沙箱/评测实现）属闭源商业层。
