---
name: dsh-upgrade-runbook
description: DSH（DeepSeek Harness）官方升级避坑 Runbook + 数据预检脚本。当本机/笔记本/云电脑要升级 dsh（git clone 官方 tag、pnpm install+build），或升级后启动报 "file is not valid JSON" / "stored record does not match its schema"，或一键启动指向旧源码路径起不来时使用。含 preflight.ps1（剥 BOM + JSON 校验）。
---

# DSH 升级 Runbook（2026-09-04 实战沉淀）

原则：**数据与源码分离**（DSH_HOME 数据不动）、**源码新目录可回滚**、**先测原生再打补丁**。

## 使用时机
- 收到本技能 = 该机器要升级 DSH 前，先跑 preflight 再动手
- 升级后启动失败（JSON/BOM/schema 报错）→ 按下方步骤 4 修复
- 一键启动起不来 → 步骤 5 检查启动链路径

## 步骤
见同目录 `RUNBOOK.md`（完整七步）与 `scripts/preflight.ps1`。

快速版：
```powershell
# 1) 预检数据（升级前/报错时跑）
powershell -ExecutionPolicy Bypass -File .\scripts\preflight.ps1
# 2) 官方源码（新目录）
git clone --depth 1 --branch dsh-v0.1.3-alpha.1 https://github.com/deepseek-ai/deepseek-harness.git D:\deepseek-harness-v013
# 3) 构建
cd D:\deepseek-harness-v013; npx -y pnpm@11.7.0 install; npx -y pnpm@11.7.0 build
# 4) 启动看日志，schema 报错→给缺字段补默认值（如 workspace 缺 sessionIds → 补 "sessionIds": []）
# 5) 把 bat/技能config/restart.cmd/桌面lnk/开机自启 全部指向新目录（别漏）
# 6) 先测新版原生能力（贴图）再决定是否移植本地补丁
# 7) 验证 + 旧目录保留回滚
```

三条铁律：
1. JSON/配置只用 **utf8NoBOM** 写（PS5.1 `Set-Content -Encoding utf8` 会留 BOM，新版 JSON.parse 拒收）
2. 别用 tar 解官方源码包（仓库有 symlink，Windows 报 Invalid argument）→ 用 git clone
3. 改动官方包前先导出 diff/新文件备份；升级后先测原生，缺再移植
