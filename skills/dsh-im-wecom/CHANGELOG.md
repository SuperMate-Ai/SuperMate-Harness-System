# Changelog

本项目持续更新。每次迭代都会在这里记录：新功能、行为变化、文档改进与实测经验。

## [v1.0.1] — 2026-08-30

### 新增 / 改进

- **归纳进 SuperMate Harness System**：`dsh-im-wecom` 已装配进 SuperMate 编排体——能力矩阵新增「IM 对话 / 视觉（网页通道）」两行，插件调用协议新增「企微读图」条目，关联技能与通用执行规范同步补充（`Supermate/SKILL.md`）。
- **BACKUP.md**：新增本地备份映射文档（发布内容 ↔ 本地 git 副本 ↔ 运行副本），含双 git 结构与恢复方法。
- **本机运行副本版本化**：`dsh-im-patched`（补丁版插件）建立 git 仓库，源码改动可回滚、可 diff。
- **代理脚本路径通用化**：`wecom-qwen-proxy.mjs` 默认千问脚本路径改为按 `$DSH_HOME/skills/…` 解析（`DSH_HOME` 未设时回退 `~/.dsh`），跨机器可用，不再依赖开发机绝对路径。

### 兼容性

- 行为不变：本机 `DSH_HOME` 存在时，通用解析与旧硬编码解析结果一致，已重建 bundle 验证。

---

## [v1.0.0] — 2026-08-30

初始发布：企业微信智能机器人 × DeepSeek Harness 接入 Skill。

### 新增

- **接入能力**：基于 `@xmanrui/dsh-im`（v4.1.0）官方插件接入企微智能机器人，官方 WebSocket 长连接，无需公网。
- **🧠 千问侧栏读图代理（核心增强）**：企微图片 → 夸克千问侧栏（CDP）分析 → 只把分析文本交给 Harness 模型。纯文本模型（如 deepseek-v4-flash）也能"看图"，且模型请求中不出现任何图片，能力预检永不触发。
  - `patch/wecom-qwen-proxy.mjs`：代理核心（下载解密 → 临时文件 → qwen-vision.js → 纯文本 blocks；全局串行队列、120s 超时、临时目录自动清理）。
  - `patch/apply-patch.ps1`：一键打补丁 + 重建 + `link:` 安装（幂等，含 -Profile / -SkipInstall 参数）。
  - `patch/bridge-change.md`：`wecom-bridge.mjs` 两处改动的精确说明与回滚方法。
- **文档**：README（总览/特性/架构/快速开始/排错）、SKILL.md（DSH skill 指令）、FEATURES.md（逐功能原理与配置）。

### 实测验证（本仓库开发环境）

- 凭据绑定：Bot ID + Secret 写入 DSH 凭据存储（`.credentials.yaml`，仅存引用），配置 `integrations/dsh-wecom/config.json`。
- 长连接：SDK 预检 AUTH-OK；Host 建立到企微长连接服务器的 Established 443 连接。
- 千问侧栏读图：测试图（含文字）识别成功；企微发图全链路通过。
- 文本对话：企微发文字消息正常流式回复。

### 已知说明

- 千问侧栏代理依赖夸克浏览器调试模式（`--remote-debugging-port=9222`）与千问对话页打开；异常时自动回退原插件图片逻辑（纯文本模型会提示"不支持图片"）。
- 补丁基于 `@xmanrui/dsh-im@4.1.0` 源码；上游升级后需重新执行 `apply-patch.ps1` 适配。

---

## 更新计划（Roadmap）

- [ ] 多机器人并发下千问代理队列的隔离优化
- [ ] 图片分析结果缓存（相同图片短时间免重复分析）
- [ ] 支持把千问分析失败时的提示改为更友好的引导文案
- [ ] 补充使用截图 / 演示视频
- [ ] 适配 `@xmanrui/dsh-im` 上游新版本
