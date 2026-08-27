---
name: quark-qwen-vision
description: 夸克浏览器专用视觉 skill——通过 CDP 网页操作调用夸克内置千问（qwen-vl）看图。当需要分析图片内容（识图/描述/OCR/反推提示词/图像对比）且本机已装夸克浏览器时使用。原理：夸克以调试模式（--remote-debugging-port=9222）运行 → CDP 控制千问对话页（p.quark.cn/pcquark-chat/sidebar）→ 模拟粘贴图片 + 提问 → 读取回复。零依赖：无需 Ollama、无需 API Key。前置条件：夸克浏览器正在调试模式运行且千问对话页已打开。
user-invocable: true
---

# quark-qwen-vision — 夸克浏览器专用视觉 Skill

> 用**夸克浏览器内置的千问（qwen-vl）模型**看图，全程网页操作，零本地算力、零 API Key。
> 本机视觉方案：`deepseek-eyes` 的替代通道（无 Ollama 时走这个）。

## 前置条件（使用前必须确认）

1. **夸克浏览器以调试模式运行**（推荐一键启动，自动查找夸克路径）：
   ```powershell
   powershell -ExecutionPolicy Bypass -File "<skill 目录>\scripts\start-quark.ps1"
   ```
   该脚本自动：查找 quark.exe（常见目录 / PATH / 注册表）→ 若 9222 未监听则重启夸克 → 打开千问对话页。
   手动方式（脚本找不到夸克时）：
   ```powershell
   # 先关掉所有 quark 进程，再用本机夸克路径带调试端口启动：
   Get-Process quark -ErrorAction SilentlyContinue | Stop-Process -Force
   Start-Process '<本机夸克安装路径>\quark.exe' -ArgumentList '--remote-debugging-port=9222'
   # 已知机型：台式机 C:\Program Files\Quark\quark.exe（或 7.1.0.949 子目录）｜笔记本 C:\Users\<用户名>\AppData\Local\Programs\Quark\quark.exe
   ```
2. **千问对话页已打开**：访问 `https://p.quark.cn/pcquark-chat/sidebar`（或点夸克 AI 侧边栏）。
   - 验证：`http://127.0.0.1:9222/json/list` 返回 200 且列表中存在 `pcquark-chat` 页面。

## 调用方式

```powershell
node "<skill 目录>\scripts\qwen-vision.js" <图片路径> ["问题"]
```

示例（`<skill 目录>` 按本机实际替换，不写死任何机型路径）：
```powershell
# 通用写法（skill 目录 = DSH 用户级 skills 根：<DSH_HOME>/skills 或 ~/.dsh/skills）
node "<skill 目录>\scripts\qwen-vision.js" "<图片路径>" "这张图是什么？反推提示词"
```

## 文生图（Qwen-Image 2.0）

千问对话**原生支持文生图**（Qwen-Image 2.0 模型），已封装 `gen-image.js`：

```powershell
node "<skill 目录>\scripts\gen-image.js" "英文提示词" [输出目录]
```

- 流程：发送提示词 → 千问调用 Qwen-Image 2.0 生成 → 脚本自动轮询抓取图片 URL → 下载保存到输出目录（默认当前工作目录下 `generated/`）
- 千问会附带给出多条**迭代建议**（背景/构图/风格调整），可直接回传继续优化
- 实测：赛博朋克机械背包、新中式国学海报均生成成功（多张高清 + 预览图）

## 视频输入（不支持）

千问对话页**仅接受图片输入**——模拟粘贴 mp4 会被忽略（上传栏无反应）。视频分析需走 `ffmpeg` 抽帧后逐帧/拼图再喂给千问。

## 实战闭环（推荐工作流）

```
看图（qwen-vision.js）→ 反推提示词 → 千问优化 → 文生图（gen-image.js）/ 云端视频（RH 工作流）
```

## 脚本清单

| 脚本 | 用途 |
|---|---|
| `qwen-vision.js` | 看图分析 / 反推提示词（主工具）|
| `gen-image.js` | 文生图（Qwen-Image 2.0）|
| `cdp.js` | CDP 客户端库（其它脚本共用）|
| `start-quark.ps1` | 跨机器一键启动：自动找夸克 → 调试模式重启 → 打开千问对话页 |

## 工作原理（网页操作四步）

```
1. CDP 连接夸克千问对话页（p.quark.cn/pcquark-chat/sidebar）
2. 读取本地图片 → base64 → File → 构造 ClipboardEvent paste 模拟粘贴
3. 输入问题 → 点击 .submit-button 发送
4. 轮询页面文本直至回复稳定 → 输出千问回答
```

## 关键经验（踩坑记录）

- **launcher 页不是对话页**：`chrome://ai-desktop-plugin/launcher/` 只是快速输入入口；真正的对话页是 `https://p.quark.cn/pcquark-chat/sidebar`，回复渲染在这里
- **发送按钮**：`.submit-button`（输入文字后激活为 `.submit-button.active`）；模拟 Enter 键无效，必须点击按钮
- **图片上传**：点 addButton 走 OS 原生文件对话框（CDP 无法操作）；正确姿势是**模拟 paste 事件**（ClipboardEvent + DataTransfer + File）
- **读取回复**：轮询 `document.body.innerText`，连续 3-4 轮无变化视为回复完成
- **回复可能很长**：输出截断至 8000 字符，必要时分段读

## 故障排查

| 现象 | 处理 |
|---|---|
| 脚本报"未找到千问对话页" | 夸克未带调试端口启动，或侧边栏未打开 → 按前置条件处理 |
| 发送后无回复 | 等待更久（流式输出）；检查千问页面是否有错误提示 |
| 图片没挂上 | 确认文件存在、格式为 png/jpg/webp；大图建议先压缩到 1080px 内 |

## 关联

- 工具脚本目录：`<skill 目录>\scripts\`（cdp.js 客户端 / qwen-vision.js 看图 / gen-image.js 生图 / start-quark.ps1 启动器）
- 跨机器通用性：脚本不依赖任何绝对路径——ws 自动解析（Node ≥ 22 内置 WebSocket 或 ws 包）、夸克路径自动探测、生图输出默认当前目录 `generated/`
- 本机视觉备选：`deepseek-eyes` skill 的 openai 通道（需 DashScope Key，未配置）
