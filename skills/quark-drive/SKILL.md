---
name: quark-drive
description: 夸克网盘下载/管理 skill——通过 CDP 操作夸克浏览器中的夸克网盘（clouddrive）实现文件下载与查看。⚠️ 必须**在夸克浏览器中运行 SuperMate Harness System**（DSH 跑在夸克标签页里），以复用夸克的登录状态（网盘免重复登录验证）。当需要从夸克网盘下载文件、查看网盘内容、检查传输状态时使用。零 API Key、零凭据——全靠夸克浏览器登录态。
user-invocable: true
---

# quark-drive — 夸克网盘下载 Skill

> 通过 CDP 操作夸克浏览器里的夸克网盘：定位文件 → 选中 → 触发下载 → 传输列表确认。
> 实测打通：`JFZSKSealScript_V3.5.ttf`（2.36MB）下载成功 ✅

## ⚠️ 前置条件（关键）

1. **必须在夸克浏览器中运行 SuperMate Harness System**：
   - 用夸克打开 `http://127.0.0.1:3080`（DSH 跑在夸克标签页）
   - 这样 CDP 控制的是同一个夸克实例，**夸克网盘登录态直接复用**（无需额外登录/凭据）
2. 夸克以调试端口运行：`quark.exe --remote-debugging-port=9222`
3. 夸克网盘已登录（打开 `uccd://cloud.quark/clouddrive/` 或网盘首页确认）

## 脚本清单

| 脚本 | 用途 |
|---|---|
| `quark-drive-read.js` | 读取网盘当前页面内容（文件夹/文件列表/详情）|
| `quark-drive-download.js` | **按文件名关键字下载**：`node quark-drive-download.js <关键字>` |
| `quark-transfer-read.js` | 读取夸克传输列表（下载进度/完成状态）|
| `cdp.js` | CDP 客户端库 |

## 调用方式

```powershell
# 1. 确认网盘页面（用户切到目标文件夹，或先 read 看当前在哪）
node "<skill>\scripts\quark-drive-read.js"

# 2. 按文件名关键字下载（会在当前列表页找文件）
node "<skill>\scripts\quark-drive-download.js" "JFZSKSealScript"

# 3. 确认下载状态
node "<skill>\scripts\quark-transfer-read.js"
```

## 工作原理

```
CDP 连接夸克网盘列表页 → 定位文件行（cloud-column-file-item，含关键字）
→ 点击选中 → 点"下载"按钮（quark-cloud-drive-button）
→ 夸克传输列表开始下载 → 完成 → 落到夸克下载目录（D:\AI\Quark_Download 等，看夸克设置）
```

## 关键经验（踩坑记录）

- **文件项定位**：文件行是 `cloud-column-file-item` 类（275×34 的行），**不是**详情面板的标题元素（`FileDetail__detail-title`）——点错会只开详情不选中
- **下载按钮**：用工具栏 `quark-cloud-drive-button` 类的大"下载"按钮（`operate-name` 小按钮可能无效）
- **下载走传输列表**：夸克网盘下载不进标准浏览器下载，走夸克"传输"（悬浮胶囊/传输列表页），完成后文件在夸克设置的下载目录（本机实测 `D:\AI\Quark_Download\`）
- **多点击会产生多个任务**：重复点击下载会生成带哈希的副本（如 `xxx-8a5b22a5fa53.ttf`），无需重复点
- **下载目录**：夸克设置里配置（不是系统 Downloads），找文件先查夸克下载目录

## 故障排查

| 现象 | 处理 |
|---|---|
| "未找到夸克网盘列表页" | 确认夸克 9222 + 网盘页面打开（`clouddrive` 且 `list`）|
| 未找到文件 | 确认当前文件夹包含目标文件；切目录或提供完整文件名 |
| 下载没开始 | 点 `quark-cloud-drive-button` 大按钮；查传输列表是否在排队 |
| 找不到下载文件 | 查夸克下载目录（夸克设置 → 下载）|

## 关联

- 同族：`quark-qwen-vision`（千问视觉）、`quark-harness-launcher`（一键启动）
- 登录态原则：**一切夸克系能力都靠"DSH 跑在夸克里"复用登录态**，零 API Key、零凭据
