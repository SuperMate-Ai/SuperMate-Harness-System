---
name: hermes-memory
description: Cross-session persistent memory and self-evolution for Harness, adapted from Hermes Agent's memory system. Use at the start of work (load MEMORY.md/USER.md context), at the end of significant tasks (consolidate lessons into memory), when the user mentions memory/persistence/self-improvement/remembering across sessions, when updating or creating skills from experience, or when deciding whether to record or skip information. Hermes 记忆系统方法论（跨会话持久记忆 + 自我进化）。
---

# Hermes Memory（跨会话持久记忆与自我进化）

原型：Hermes Agent（Nous Research, 23 万 star）的 `MEMORY.md`/`USER.md` 双层记忆、冻结快照注入、容量纪律、session_search 与"学习图"。本 skill 将其适配到 Harness（vault 持久化 + 会话工作流）。

## 核心哲学

- **有界精选记忆**：不是记住一切，而是记住"跨会话仍然重要"的事实；容量有限反而迫使记忆保持聚焦。
- **agent 自主管理**：记忆由 agent 自己增删改，不需要用户手动维护。
- **主动写入**：学到就记（偏好/环境/纠正/约定/经验），不需要等用户说"记住"。
- **自我进化**：每次任务结束 = 一次学习机会；skill 用完要复盘并改进，不改进的 skill 会过时。

## 记忆文件（Harness = vault 持久化）

| 文件 | 位置 | 用途 | 容量 |
|---|---|---|---|
| `MEMORY.md` | `Harness\MEMORY.md` | agent 个人笔记：环境事实、项目结构、约定、经验教训、完成任务 | ≤ 40 条 |
| `USER.md` | `Harness\USER.md` | 用户画像：身份、偏好、沟通风格、工作习惯 | ≤ 15 条 |

### 格式规范

```
# MEMORY.md（或 USER.md）

> 记忆库：每行一条，`§` 分隔；顶部标注容量：`[用量 n/40 条]`
§
## 条目标题（≤80 字符）
正文（≤200 字符，信息密度优先，可多行）
§
## 下一条目
...
```

- 条目间用 `§` 分隔（Hermes 原版约定）
- 标题即检索键；正文压缩多个相关事实
- 更新后更新顶部用量标记
- 文件用 UTF-8 无 BOM 保存（与 vault 一致）

## 记忆协议（会话内动作）

会话开始时**必须**读取两个文件；会话中按需维护：

- **add**：新增条目（自动去重——已存在相同内容则跳过）
- **replace**：用 `old_text` 唯一子串定位旧条目并替换（子串命中多条时报错，要求更精确）
- **remove**：删除不再相关的条目（同样用唯一子串）
- **consolidate**：容量 >80% 时，合并相关条目为一条综合条目（如三条"项目用 X"→ 一条完整项目描述）

> 用 Harness 文件工具（read/edit/write）操作 `Harness\MEMORY.md` 与 `Harness\USER.md`。

## 写入纪律（Save vs Skip）

### 主动保存（Save）
- 用户偏好："我喜欢简洁回答" / "用中文交流" → `user`
- 环境事实："工作区在 E:\Harness Workspace，vault 在 Harness/" → `memory`
- 纠正："不要用 sudo，用户在 docker 组" → `memory`
- 约定："提示词统一存 vault，新源丢链接给我" → `memory`
- 完成任务："2026-08-15 构建了超级提示词库（30,881 条）" → `memory`
- 经验教训："PicX 提示词以英文为主，中文关键词搜 VlogPrompt" → `memory`
- 显式请求："记住我每月轮换 API key" → `memory`

### 跳过（Skip）
- 琐碎/过泛："用户问过 Python"——无用
- 可重新发现："Python 3.12 支持 f-string 嵌套"——可搜索
- 原始数据大段（代码/日志/表格）——不适合记忆，适合存文件
- 会话临时物（临时路径、一次性调试上下文）
- 已在其他上下文文件里的信息（避免重复）

## 会话生命周期

### 会话开始（Load）
1. 读取 `Harness\MEMORY.md` + `Harness\USER.md`
2. 将关键记忆纳入当前工作上下文（环境、用户偏好、进行中项目）
3. 如需找回历史细节：`scan_vault` 或 `search_assets` 检索 vault 旧笔记（等价于 Hermes 的 session_search——vault 就是我们的历史库）

### 会话结束/大任务完成（Consolidate）
1. 复盘：本次学到什么？用户偏好有无变化？有无新约定？
2. 按"写入纪律"更新 MEMORY.md / USER.md
3. 有值得留档的过程 → 写 vault 专题笔记（如 [[X热门提示词收集 2026-08]]）
4. 更新相关索引（首页/超级提示词库等）

## 自我进化（Self-Improving）

### skill 复盘（Skill Post-Mortem）
使用过某个 skill 后（或用户反馈后）：
1. 评估：skill 是否达到了预期效果？哪里失效/低效？
2. 有改进 → 直接编辑该 skill 的 `SKILL.md`（.dsh/skills/<name>/）并记录变更
3. 无效的流程删掉，有效的沉淀成规则

### 经验 → 新 skill
当同一类工作重复出现且无现成 skill：
1. 在 `Harness\` 先写经验笔记（草稿）
2. 提炼为可复用流程 → 创建 `.dsh/skills/<name>/SKILL.md`（frontmatter: name + description）
3. 记录到 MEMORY.md（"已建 skill xxx，处理 yyy 类任务"）

### 学习索引（可选，类学习图）
每月/每季度将 MEMORY.md 条目与新增 skill 汇总为一张 `Harness\学习图谱.md`：
- 技能节点：用过的/新建的 skill
- 记忆节点：关键 MEMORY 条目
- 关联：哪些记忆支撑哪些技能（词汇重叠判断）

## 与 Harness 既有机制的配合

- **scan_vault / search_assets**：vault 全量检索 = Hermes session_search
- **create_goal / update_goal**：跨轮目标 = 任务级记忆（goal 状态机）
- **vault 笔记**：长期知识沉淀 = 外部记忆提供器（知识图谱）
- **.dsh/skills/**：技能目录 = Hermes skill 生态（ClawHub 类比）

## 相关

- [[超级提示词库使用指南]]
- [[视频提示词方法论]]
- [[colleague-cameron 卡梅隆]]
- [[首页]]
