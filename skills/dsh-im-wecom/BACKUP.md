# 本地备份说明（BACKUP）

> 原则：**发布到 GitHub 的每个程序文件，本地都必须有一份 git 版本化的副本**。
> 凭据（Bot ID / Secret / API Key）**永不进入**仓库或备份，只存 DSH 凭据存储（`$DSH_HOME/.credentials.yaml`）。

## 备份映射

| 内容 | 发布（GitHub） | 本地主副本（git） | 本地运行副本（git） |
|---|---|---|---|
| README / SKILL / FEATURES / CHANGELOG / LICENSE | `SuperMate-Ai/dsh-im-wecom` | `D:\AI\Harness\repo-dsh-im-wecom` | 本机 skill：`D:\AI\Dsh_Data\skills\dsh-im-wecom\SKILL.md`（同步副本） |
| `patch/wecom-qwen-proxy.mjs`（代理模块） | 同上 `patch/` | `repo-dsh-im-wecom\patch\` | `D:\AI\Harness\dsh-im-patched\src\channels\wecom\`（经 `apply-patch.ps1` 拷贝 + link 安装） |
| `patch/apply-patch.ps1`、`patch/bridge-change.md` | 同上 `patch/` | `repo-dsh-im-wecom\patch\` | 工具脚本，用时从主副本取 |
| 上游插件 `@xmanrui/dsh-im@4.1.0` | npm / GitHub 上游 | （可随时 `npm install` 重取） | `dsh-im-patched`（含我们 2 处改动 + 1 个新文件） |

## 双 git 结构

1. **发布仓库** `D:\AI\Harness\repo-dsh-im-wecom` —— 推送 GitHub 的源（`origin/main`）。
2. **运行副本** `D:\AI\Harness\dsh-im-patched` —— 本地实际 link 安装的补丁版插件（含 `node_modules` 构建依赖；`lib/` 为构建产物，忽略入库，可 `node plugin-src/host/build.mjs` 重建）。

两处都是 git 仓库：发布内容与运行源码各自可回滚、可 diff。

## 版本同步流程

每次更新（改发布内容或改运行源码）：

```powershell
# 1) 发布仓库（改完推 GitHub）
cd D:\AI\Harness\repo-dsh-im-wecom
git add -A && git commit -m "..." && git push origin main

# 2) 运行源码（若补丁有改动）
cd D:\AI\Harness\dsh-im-patched
git add -A && git commit -m "..."

# 3) 运行版重新构建并生效
cd D:\AI\Harness\dsh-im-patched
node plugin-src/host/build.mjs          # 重建 lib/index.js
# 重启 dsh web 后生效
```

## 恢复方法

| 场景 | 操作 |
|---|---|
| 发布内容丢失 | `git clone https://github.com/SuperMate-Ai/dsh-im-wecom` 或从 `repo-dsh-im-wecom` 直接取 |
| 运行副本损坏 / 误改 | `cd dsh-im-patched && git checkout .` 回滚；或删除后重新 `apply-patch.ps1` |
| 插件升级后补丁失效 | 重新执行 `patch\apply-patch.ps1`（基于新版本源码重新打补丁） |
| 误删 node_modules | `cd dsh-im-patched && npm install` 重建依赖 |

## 本机关键路径速查

- 发布主副本：`D:\AI\Harness\repo-dsh-im-wecom\`
- 运行补丁副本：`D:\AI\Harness\dsh-im-patched\`
- 本机 skill：`D:\AI\Dsh_Data\skills\dsh-im-wecom\`（SKILL.md 与发布版同步）
- 凭据存储：`D:\AI\Dsh_Data\.credentials.yaml`（不备份、不入库）
- 企微配置：`D:\AI\Dsh_Data\integrations\dsh-wecom\config.json`（仅引用，无明文 Secret）
