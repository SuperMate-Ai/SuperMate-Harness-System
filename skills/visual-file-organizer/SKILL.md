---
name: visual-file-organizer
description: 视觉文件整理——批量把文件夹里的图片交给夸克千问（qwen-vl）分析，按「内容总结(≤6字)+风格+文件类型」自动重命名。当用户希望整理图片文件夹、批量智能命名、按内容给图片起名时使用。原理：夸克以调试模式运行 → CDP 控制千问对话页 → 逐张模拟粘贴图片+提问「内容|风格」→ 以问题文本为锚点截取本次回复 → 用「内容+风格+扩展名」重命名。零 API Key。
user-invocable: true
---

# visual-file-organizer — 视觉文件整理

> 批量给图片"看懂内容、自动起名"：**逐张问千问 → 得到「内容|风格」→ 重命名为 内容(≤6字)+风格+扩展名**。
> 适用于"整理图片文件夹"场景（数字模特、素材库、网盘下载整理等）。

## 前置条件（使用前必须确认）

1. **夸克浏览器以调试模式运行**（端口 9222）——用 `quark-qwen-vision` skill 的 `start-quark.ps1` 启动：
   ```powershell
   powershell -ExecutionPolicy Bypass -File "<quark-qwen-vision skill 目录>\scripts\start-quark.ps1"
   ```
   验证：`http://127.0.0.1:9222/json/list` 返回 200。
2. **千问对话页已打开**：`https://p.quark.cn/pcquark-chat/sidebar`（夸克 AI 侧边栏）。
   - 验证：`/json/list` 中存在 URL 含 `pcquark-chat` 的 page。

## 调用方式

```powershell
node "<skill 目录>\scripts\organ-rename.js" "<图片目录>" [--apply] [-n 数量]
```

- 不带 `--apply`：只分析，打印建议的新文件名（安全预览）
- 加 `--apply`：分析并实际重命名
- `-n 3`：只处理前 3 张（排序后）

示例：
```powershell
# 预览：分析 D:\...\数字模特 目录并打印建议名
node "D:\SuperMate Harness System\skills\visual-file-organizer\scripts\organ-rename.js" "D:\Supermate DSHD\Quark_Downlaod\数字模特"

# 直接重命名
node "D:\SuperMate Harness System\skills\visual-file-organizer\scripts\organ-rename.js" "D:\Supermate DSHD\Quark_Downlaod\数字模特" --apply
```

## WebP → PNG 转换（webp2png.js）

文件夹整理时经常遇到 webp 素材，可顺便转成 PNG（更通用、便于后期处理）：

```powershell
# 单文件：输出到指定路径
node "<skill 目录>\scripts\webp2png.js" "<图片.webp>" ["输出.png"]

# 批量：目录内所有 webp → 同名 png（已存在的跳过）
node "<skill 目录>\scripts\webp2png.js" "<图片目录>"
```

- **零依赖**：用浏览器内核（夸克）自身的 WebP 解码 → canvas 逐像素重编码为 PNG，无损、保原分辨率
- 实测：数字模特目录 9 张 webp 全部转换成功（1024×1536 ~ 1248×1664）
- 前置条件同 organ-rename.js：夸克以 9222 调试模式运行即可（不需要千问对话页）

## 命名规则

`内容总结(≤6字) + 风格(≤4字) + 原扩展名`

实测示例（数字模特目录，2026-08-27）：
| 原文件名 | 新文件名 |
|---|---|
| 015653r22z1o2pa97htopa.webp | 车内美女回眸清新甜美.webp |
| 212233hbrej8hodrjy9jne.webp | 墨镜少女特写酷飒时尚.webp |
| 即梦精选-0012.jpg | 荷塘精灵少女梦幻唯美.jpg |
| 即梦精选-0022.jpg | 灯会古装少女华丽唯美.jpg |

## 工作原理（每张图片四步）

```
1. CDP 连接千问对话页（p.quark.cn/pcquark-chat/sidebar）
2. 读图片 → base64 → File → ClipboardEvent paste 模拟粘贴
3. 输入固定问题：只回答一行「内容|风格」→ 点击 .submit-button 发送
4. 轮询页面文本稳定后，以问题文本最后一次出现为锚点截取本次回复
   → 解析 "内容|风格" → 生成新文件名（内容+风格+扩展名）
```

## 关键经验（踩坑记录，2026-08-27 实测）

- **夸克千问是累积会话**：多次提问后 `document.body.innerText` 会越来越长（把之前的鼠标图、选衣服图分析全带出来）。解法 = **以问题文本为锚点**，取 `lastIndexOf(QUESTION)` 之后的内容，就是本次回答；再取第一行就得到 `内容|风格`。
- **提问要严格限定格式**：必须让千问"只回答一行 内容|风格"并给示例，否则它会输出一长段描述（首次测试就吃到了教训：问开放问题，回复是 8000 字长文还混着旧会话）。
- **正则解析**：`^([^\|]{1,8})\|([^\|]{1,8})` ——内容限制 ≤8 字符（含 ≤6 汉字）、风格 ≤8 字符；未匹配则标 `格式未匹配`，不自动重命名，避免起错名。
- **每张图之间小睡 1s**，避免粘贴/发送事件冲突。
- **先预览后执行**：脚本默认只打印，`--apply` 才改文件；目标名已存在时跳过，防覆盖。
- **宽字符扩展名安全**：新文件名会是中文，Windows 完全支持；但脚本内统一用 `path.extname` 取原扩展名，不硬编码。
- 成功率实测 12/12（数字模特目录）。

## 故障排查

| 现象 | 处理 |
|---|---|
| 报"未找到千问对话页" | 夸克未带调试端口启动，或侧边栏未打开 → 按前置条件处理 |
| 某张图返回"格式未匹配" | 千问偶尔输出多行，脚本只取第一行；检查 `raw` 字段，可手动纠正后重命名 |
| 粘贴失败 | 确认目录内是 png/jpg/webp；大图建议 <10MB |
| 重命名后顺序乱 | 文件名按排序处理，不影响内容；可重跑预览核对 |

## 脚本清单

| 文件 | 用途 |
|---|---|
| `scripts/organ-rename.js` | 主脚本：批量分析 + 生成新名 + 可选应用重命名 |
| `scripts/webp2png.js` | WebP → PNG 批量无损转换（浏览器内核 canvas）|
| `scripts/cdp.js` | CDP 客户端库（与 quark-qwen-vision 共用，独立拷贝）|

## 关联

- 上游依赖：`quark-qwen-vision`（提供 start-quark.ps1 启动夸克调试模式；本技能复用其 cdp.js 与千问页操作逻辑）
- 下游配合：`quark-netdisk-download`（网盘下载图片到本地后，即可用本技能整理命名）
- 典型闭环：**网盘取图（quark-netdisk-download）→ 批量整理命名（本技能）→ 千问看图/生图（quark-qwen-vision）**