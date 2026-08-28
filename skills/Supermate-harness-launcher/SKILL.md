---
name: Supermate-harness-launcher
description: 一键启动 DeepSeek Harness + 夸克浏览器（千问悬浮侧边栏）。双击入口后自动：① 启动 Harness 网页服务（可配置命令，未运行才启动）→ ② 确保夸克浏览器以调试端口 9222 运行 → ③ 打开 Harness 界面与千问侧边栏页 → ④ 截图定位夸克原生"问AI"按钮并点击，弹出千问悬浮侧边栏面板。跨机型/分辨率/DPI 自适应（位置比例不变、像素变化，用截图+颜色扫描定位）。当用户想"用夸克打开 Harness/千问侧边栏/一键进入工作环境"时使用。
user-invocable: true
---

# Supermate-harness-launcher — 夸克一键启动 DeepSeek Harness

> 一个入口干完所有事：**起 Harness → 开夸克 → 千问悬浮侧边栏弹出**。跨机型通用。

## 环境要求（准确版）

| 项 | 要求 |
|---|---|
| 操作系统 | **Windows 10/11**（脚本为 .bat/.ps1；夸克浏览器为 Windows 版）|
| DeepSeek Harness | 已安装并可运行；网页界面默认 `http://127.0.0.1:3080`（未运行且未配置启动命令时脚本会提示手动启动）|
| 夸克浏览器 | **已安装**（自动探测常见目录/PATH；找不到时在 `config.ps1` 手动指定 `$QuarkExe`）|
| PowerShell | Windows 自带 5.1+ 或 PS7 均可（脚本使用 System.Drawing / user32 / Invoke-RestMethod）|
| curl.exe | Win10/11 自带（用于端口探测，可选）|
| 网络 | 本地自动化无需外网；千问侧边栏页需要夸克能访问 `p.quark.cn` |

**已实测机型**（供参考，非硬性要求）：
- 台式机：NVIDIA RTX 5080 16GB / 32GB 内存 / Intel i7-14700KF，1920×1080，Windows 11
- 笔记本（HUAWEI）：13th Gen Intel i5-13420H / 16GB DDR5-4267 / Intel UHD 核显 / 屏幕 1536×960 逻辑 @125% DPI（物理 1920×1200）/ Windows 11

屏幕分辨率/DPI 不同不影响使用（脚本按窗口比例定位）。

**🔒 安全说明**：本 skill **零 API Key、零凭据、零外传**——所有操作均为本地自动化（本地端口 9222/3080、本地窗口点击、本地截图），不含任何后门/遥测/外连；`config.ps1` 只存本机路径。上传公网前请确认无真实密钥（见仓库 SECURITY.md 铁律）。

## 安装与配置

1. 把 `Supermate-harness-launcher` 整个文件夹放进 `~/.dsh/skills/`。
2. 编辑 `config.ps1`（只需改一次）：
   - `$HarnessStartCmd`：启动 Harness 服务器的命令路径（如 `E:\deepseek-harness\start-web.cmd`）；留空则不自动启动（需手动）
   - `$QuarkExe`：夸克 exe 路径；留空=自动探测
   - `$HarnessUrl`：Harness 网页地址（默认 `http://127.0.0.1:3080`）

## 使用

```powershell
# 双击即可（推荐）：scripts\launch.bat

# 或命令行：
powershell -ExecutionPolicy Bypass -File scripts\launch.ps1
```

**带图标（红底白 H）的桌面快捷方式**：创建指向 `scripts\launch.bat` 的快捷方式，图标选 `assets\quark-harness.ico`。

## 流程（脚本做了什么）

1. **Harness**：检查 `http://127.0.0.1:3080`，未运行且配置了 `HarnessStartCmd` → 启动并等待就绪（最多 120s）
2. **夸克**：检查调试端口 9222；未就绪 → 自动探测 quark.exe → 以 `--remote-debugging-port=9222` 启动并打开两个标签（Harness 界面 + 千问侧边栏页）
3. **悬浮侧边栏**：`quark_ai_panel.ps1` 截图定位夸克右上角"问AI"按钮（蓝星✨图标）→ 置前窗口 → 模拟点击，千问悬浮面板在页面右侧弹出

## 脚本清单

| 文件 | 用途 |
|---|---|
| `scripts/launch.bat` | 双击入口（调用 launch.ps1）|
| `scripts/launch.ps1` | 主流程：起 Harness → 确保夸克 9222 → 开标签 → 弹面板 |
| `scripts/quark_prepare.ps1` | 通过 CDP 确保 3080/千问侧边栏标签存在（缺哪个建哪个）|
| `scripts/quark_ai_panel.ps1` | 截图+颜色扫描定位"问AI"按钮并点击（DPI 感知、比例兜底）|
| `config.ps1` | 本机配置（Harness 启动命令 / 夸克路径 / 地址）|
| `assets/quark-harness.ico` | 红底白 H 图标（快捷方式用）|

## 工作原理与踩坑（2026-08-25 实测）

- **千问侧边栏页必须用带参 URL**：`https://p.quark.cn/pcquark-chat/sidebar?entry=frame&tab_id=<随机数>&entry_l2=up_right&type=website`。普通 URL 会报 `SidebarService instanceId is required`（只加载壳层）。
- **"问AI"按钮是夸克原生右上角工具栏按钮**（蓝星✨图标，位于窗口控制按钮左侧）：页面 CDP 点不到、扩展 API 直调无效、快捷键无效。解法 = OS 级模拟点击（置前窗口 + 坐标点击）。
- **跨机型/DPI**：按钮像素位置随分辨率/DPI 变化，但相对比例不变 → `quark_ai_panel.ps1` 声明 DPI 感知、按窗口比例截右上工具栏条、颜色扫描蓝色星形图标（取最顶部簇）、兜底按宽高比换算偏移（参考 1936×1048 下"右缘-175、顶缘+26"）。
- **⚠️ 不同机型点击位置不一样（实测对比）**：
  - 台式机（1920×1080 逻辑 / RTX 5080 机型）：EnumWindows 版实测——主窗口 1936×1048，蓝星命中 **(1753,19)**（验证"右缘-175"→1928-175≈1753 ✅）
  - 笔记本（1536×960 逻辑 = 物理 1920×1200 @125% DPI）：点击实测 (1712,25)（quark 主窗口 1938×1158 时）
  - **不要改死坐标**——让颜色扫描干活（蓝星簇自动定位）；只有扫描失败才用比例兜底
  - **关键坑**：夸克主窗口 `MainWindowHandle` 对 .NET 返回 0，`Select-Object -First 1` 会选到 61×61 悬浮小窗 → 必须用 `EnumWindows` 找"可见 + 面积最大"的窗口
  - **bat 入口编码坑**：`launch.bat` 必须纯 ASCII（cmd 用 GBK 代码页解析 bat，UTF-8 中文注释会乱码）
- **面板开关是"切换"**：面板已开时再运行会关闭（再点一次"问AI"恢复）。
- 附：`start-quark.ps1`（quark-qwen-vision skill 内）可单独负责"带调试端口重启夸克并开千问侧边栏"。

## 故障排查

| 现象 | 处理 |
|---|---|
| `NO_QUARK` | 未找到夸克 → 装夸克或 config.ps1 配 `$QuarkExe` |
| `NO_CDP` | 9222 未就绪 → 确认夸克以 `--remote-debugging-port=9222` 启动 |
| Harness 未启动 | config.ps1 配 `$HarnessStartCmd`，或手动启动后重跑 |
| 面板没弹出/弹了又关 | "问AI"是切换键：面板已开时脚本会关掉它，再点一次即可 |
| 点击位置偏移 | 确认夸克窗口非最小化、未被遮挡；`quark_ai_panel.ps1` 的兜底偏移按窗口比例自动缩放 |

## 关联

- 同族：`quark-qwen-vision`（夸克千问看图/生图 skill，含 start-quark.ps1）
- `doubao-creator`（豆包网页操作 skill，共用夸克 CDP）
