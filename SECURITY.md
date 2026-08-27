# SECURITY — 密钥与凭据铁律（Iron Rule）

> **铁律：凡上传到公网（本仓库 / GitHub / 其他公开平台）的资料，凡含 API 密钥、密码、令牌等凭据，一律必须先脱敏。**

## 规则（强制）

1. **真实密钥/密码绝不入库**。仓库中任何文件（文档、脚本、配置、示例）都不得出现真实凭据。
2. **凭据只存本地**，运行时从本地读取：
   - RunningHub API Key → `Local_LLM/Api_key.txt`（脚本通过 `--api-key` > `RUNNINGHUB_API_KEY` 环境变量 > 该文件 自动读取）
   - DeepSeek API Key → `.dsh/.credentials.yaml`（`DEEPSEEK_API_KEY`）
   - 其他服务凭据 → 本地配置文件 / 环境变量
3. **提交前自查**：含 `sk-`、`ghp_`、`github_pat_`、`Bearer `、32 位 hex 等疑似凭据串的内容，先确认是否为假值/测试占位。
4. **测试占位**允许：形如 `sk-0123456789abcdef`、`sk-fixture...` 的明显假值/夹具可以入库（标注 fixture），但不得与真实 key 前缀相同。
5. **发现泄露**：立即停止推送 → 在平台侧吊销/轮换该 key → 清理并强制改写历史（filter-repo）→ 记录复盘。

## 审计记录

- **2026-08-25**：全仓工作区 + git 全部历史扫描（按真实 key 前缀 pickaxe）：
  - RunningHub key（`396c55...`）：零泄露
  - DeepSeek key（`sk-e8eed1d6...`）：零泄露
  - `sk-`/`ghp_`/`Bearer` 长串：仅官方插件测试假钥（fixture）
  - `Api_key.txt` / `.env` / `.credentials.yaml`：从未入库
- 结论：**公开仓库零真实凭据**。

## .gitignore 防护

已忽略（防未来误提交）：

```gitignore
Api_key*.txt
api_key*.txt
*.env
.env*
.credentials.yaml
*credential*.yaml
*secret*.txt
*token*.txt
```

## 报告

如发现任何疑似泄露，请立即创建 Issue 并联系维护者轮换密钥。
