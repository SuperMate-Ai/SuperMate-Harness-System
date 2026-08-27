# Codex-Harness 学习报告（2026-08-23）

> 对象：OpenAI Codex CLI 开源仓库（`D:\AI\github_data\codex-main`，2026-08-19 开源）
> 规模：Rust workspace **139 个 crate**、6000+ 源文件 + Python/TypeScript 双 SDK + docs
> 方法：双 subagent 并行深挖（codex-rs 核心 + SDK 层）+ 关键文档研读

---

## 1. 总览：Codex-Harness 是什么

本地 AI coding agent 的**底层运行时框架**，三层接口 + 四大能力：

```
┌─ 三层接口 ─────────────────────────────┐
│ codex exec     轻量调用（headless 单次）│
│ SDK            Python/TS 编程编排       │
│ app-server     长会话服务（JSON-RPC）   │
├─ 四大能力 ─────────────────────────────┤
│ 沙箱执行 / 工具调用循环 / 审批流 / Skill│
└────────────────────────────────────────┘
```

## 2. 三层接口

| 层 | 实现 | 关键设计 |
|---|---|---|
| **codex exec** | `exec/` crate，`codex exec [PROMPT]` | **进程内嵌 app-server**（`in_process.rs`：用内存 channel 替代 socket）+ JSON-RPC 驱动 + `--json` JSONL 事件输出（33 种事件）+ `--ephemeral`（不落盘）+ `--dangerously_bypass_approvals_and_sandbox`（yolo 模式）|
| **SDK** | Python（`openai-codex`）+ TS（`@openai/codex-sdk`） | Python = **长驻子进程 + 双向 JSON-RPC**（stdio，可 steer/interrupt/审批/多并发回合）；TS = **每回合 spawn exec + JSONL**（一次性）|
| **app-server** | `app-server*` 系列 crate | JSON-RPC 2.0；stdio/WebSocket/Unix socket 三传输；v1/v2 协议；**宏生成 + ts-rs 导出 TS 类型**（单源）；`/readyz` `/healthz`；30 分钟无订阅线程卸载 |

**SDK 核心抽象**：`Thread`（持久化会话，落盘 `~/.codex/sessions`）→ `Turn`（一次 agent 运行，可 `run()/stream()/steer()/interrupt()`）→ `Item`（8 种产物联合类型）→ 事件全部按 turn ID 路由。

## 3. 四大能力

### 3.1 沙箱执行（多平台矩阵）
- **Linux 两段式**：外层 bubblewrap 构建文件系统视图（`--ro-bind / /` 全盘只读起步 → 受限时逐根绑定可写）→ 内层**再入本二进制**施加 `PR_SET_NO_NEW_PRIVS` + seccomp 网络隔离
- macOS Seatbelt / Windows RestrictedToken（受限令牌）
- **本地 MITM 网络代理**做网络沙箱（会话级 TLS 证书，execpolicy 在代理层裁决）
- **远程 exec-server**：命令可在远程机器执行（WebSocket + **Noise 协议加密** + pong 看门狗）
- `process-hardening`：`#[ctor]` 主前加固（PR_SET_DUMPABLE=0 / RLIMIT_CORE=0 / 清 LD_*）

### 3.2 工具调用循环（三层循环）
```
submission_loop（会话级，分发 Op）
  → run_turn（回合级：取输入 → 组装上下文 → 采样 → 工具结果回填 → 重新采样）
    → try_run_sampling_request（单次采样：流式消费 ResponseEvent）
```
- **工具与模型流并发**：工具调用装箱成 future 推入 `FuturesOrdered` 并行执行
- **并行门控**：读型工具共享读锁、写型独占写锁（RwLock）
- **step 快照式上下文**：每次采样捕获一致的 `StepContext{模型/工具/权限/MCP}`
- 工具契约：`ToolExecutor<ToolInvocation>` trait + hooks（pre/post-tool-use）+ telemetry

### 3.3 审批流（execpolicy）
- **Starlark DSL**（Bazel 配置语言）：`prefix_rule(pattern, decision=allow|prompt|deny, match, not_match)` + `network_rule` + `host_executable`
- **三阶段匹配**：精确前缀 → host executable（绝对路径绑定）→ heuristics 兜底
- **自动修订闭环**：用户批准命令 → **自动把 allow 规则写回 .rules 文件**（审批记忆沉淀为持久化策略）
- **命令规范化**：`/bin/bash -lc X` 规约为 `X` 的 argv（跨 shell 变体共享审批缓存）
- 三层联动：approval_presets → PermissionProfile → SandboxManager（**sandbox 决定能力边界，approval 决定边界内要不要问**）
- 内置 profile：`:read-only / :workspace / :danger-full-access`（与 DSH 同构！）

### 3.4 Skill 插件体系
- **与 DSH 机制同构**：SKILL.md + YAML frontmatter（name/description）+ 多根发现（`~/.agents/skills` 等）+ 渐进披露 + 目录 bundle + 命中注入
- 文件格式：SKILL.md（必填，frontmatter 仅 name/description/metadata）+ `agents/openai.yaml` + scripts/references/assets
- 发现根：项目配置/skills → $CODEX_HOME/skills → ~/.agents/skills → .system（内置，编译进二进制）→ 逐级 .agents/skills → 插件 skill
- 执行：选中 skill 正文以 `<skill>` fragment 注入模型上下文（8000 字符截断）——**与 DSH 的 `<skill_content>` block 完全同构**
- 高级：`$skill` 提及 + `[name](path)` 链接解析、模型按描述主动选择（catalog prompt："若任务明显匹配描述必须使用"）、**skill 可声明 MCP 依赖并自动 OAuth 安装**
- 插件：manifest（name/version/paths{skills,mcp_servers,apps,hooks}）→ marketplace 是 **Git 仓库**（Local/Git/Npm 三种源）

## 4. 与 DSH 的对比

| 维度 | Codex | DSH | 结论 |
|---|---|---|---|
| Skill 格式 | SKILL.md + frontmatter | SKILL.md + frontmatter | **同构**，我们方向正确 ✅ |
| 多根发现 | project/.agents/skills 逐级 | rank 100~500 优先级 | 同构（DSH 用 rank 更精细）|
| 注入方式 | `<skill>` fragment | `<skill_content>` block | 同构 |
| 沙箱 | bwrap+seccomp/Seatbelt/Windows+MITM 网络 | sandbox-windows-acl + policy 模式 | Codex 更重，DSH 更轻 |
| 审批 | Starlark DSL + 自动修订 | 模式级（ask/never）| **Codex 细粒度，值得学** |
| 协议 | JSON-RPC + 宏生成 + TS 导出 | WebSocket mux + host-apiproxy | 各有千秋 |
| 上下文管理 | 6 条铁律（有界/硬上限/10K）| agent-instructions 预算 | 都有，Codex 文档化更彻底 |

## 5. 值得学习的设计（Top 10）

1. **进程内 app-server**（`in_process.rs`）：一套 JSON-RPC 协议驱动 CLI/TUI/VSCode 全部前端——DSH 的 web/headless/tui 可参照"协议驱动一切"
2. **契约优先 + 宏生成 + TS 导出**：Rust 类型 → JSON Schema → TS 单源，双端永不漂移
3. **Starlark 审批 DSL + 自动修订闭环**：审批记忆沉淀为持久化策略（DSH 可借鉴：approval 决策自动写回 skill/配置）
4. **Linux 两段式沙箱**：bwrap 视图 + seccomp 再入 + process-hardening 主前加固
5. **MITM 网络代理沙箱**：网络白名单在代理层裁决（DSH 目前沙箱偏文件系统，网络可补）
6. **SDK 运行时钉死版本**：`openai-codex-cli-bin==0.147.0` 平台 wheel——SDK 与运行时零漂移
7. **消息路由器**：单 stdio 流按 turn/login/request id 分队列扇出（多并发回合的关键，防抢读 bug）
8. **审批回调（approval_handler）**：双向 JSON-RPC 承载人在回路（SDK 层可编程授权）
9. **rollout JSONL 双轨持久化**：append-only + SQLite 索引 + 损坏自愈（DSH 的 zstd JSONL 类似）
10. **模型上下文 6 条铁律**（AGENTS.md）：无历史重写/有界/硬上限/10K tokens/struct 化注入——DSH 上下文管理可对照审计

## 6. 我们的可落地行动建议

| 优先级 | 行动 | 借鉴来源 |
|---|---|---|
| ⭐ 高 | **Skill 体系继续深化**：加"提及机制"（`$skill` 链接引用）+ 声明式依赖（skill 自动装 MCP）| 7.3 |
| ⭐ 高 | **审批历史自动沉淀**：DSH 的 approval 决策（比如我们的 sandbox 模式切换）自动记入 skill/配置，形成"记忆" | 3.3 自动修订闭环 |
| ⭐ 中 | **上下文管理审计**：对照 6 条铁律检查 DSH 的注入（预算/上限/缓存）| AGENTS.md |
| 中 | **quark-cdp 工具层加固**：消息/事件路由参考 MessageRouter（我们目前单会话轮询，多并发时可借鉴）| SDK 报告 §5 |
| 中 | **SDK 化 DSH**：DSH 已有 headless profile，可参照 Python SDK 模式（长驻 + 双向 RPC）暴露编程接口 | SDK 报告 |
| 低 | 网络沙箱（MITM 代理）——场景需要时再评估 | 3.1 |

---

## 结论

Codex-Harness 与 DSH 在 **Skill 机制上完全同构**（SKILL.md/frontmatter/渐进披露/多根发现）——验证了我们今天搭的 skill 体系方向正确。Codex 更值得学的是**工程形态**：审批 DSL + 自动修订、协议单源、进程内多前端复用、沙箱纵深、SDK 双向 RPC 编排。这些可以直接指导 DSH 插件开发和我们的工具链进化。
