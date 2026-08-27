# NOTICE — 官方插件归属声明（Apache-2.0 · fork 拷贝）

本目录（`plugins/DSH Official/packages/`）为**官方插件源码整包拷贝**（fork 式）：

- **来源**：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 官方仓库 `packages/` 目录
- **协议**：Apache License 2.0（含专利条款），见仓库根目录 [LICENSE](../../../LICENSE)
- **拷贝方式**：保留官方目录结构 `packages/<族>/<子包>/`，整包复制 49 个插件族源码
- **排除项**：`node_modules/`（依赖）、`lib/`、`dist/`（构建产物）、`*.tsbuildinfo`（构建缓存）——依赖按各包 `package.json` 用 `pnpm install` 还原
- **拷贝时间**：2026-08（官方仓库主分支）

## 收录范围（49 族）

llm（llm / llm-deepseek / llm-pi-ai / llm-retry / token-meter）、skill（skill / skill-badge / skill-filesystem / tool-skill）、mcp（mcp-client）、sandbox（sandbox / sandbox-local / sandbox-policy / sandbox-windows-acl）、schedule、storage（storage / storage-domain / storage-json / storage-sqlite）、session、workflow、fs、shell、guard、credentials、goal、subagent、terminal、web、interaction、client、core、host、context、compaction、spill、settings、hooks、jobs、api、sdk、boot、bundle、lsp、e2b、code-runtime、subprocess、session-query、preset、typert、util、workspace、feedback、attachment、acp、identity、plan、todo、runtime-diagnostics、examples、test-support 等，与 [README.md](README.md) 索引对应。

## 使用约定

- 本目录内容遵循上游 Apache-2.0；修改/再分发请保留本 NOTICE 与上游版权声明。
- 依赖管理、构建方式以官方仓库 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 为准（pnpm workspace）。
- 与 SuperMate 自研插件（`plugins/Supermate/`）的边界：官方部分 Apache-2.0 随仓库自带；自研核心增强（调度/记忆治理/沙箱/评测实现）属闭源商业层。
