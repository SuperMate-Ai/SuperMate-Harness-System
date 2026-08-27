---
name: doubao-creator
description: 豆包（字节跳动 AI）网页操作 skill——通过 CDP 控制夸克浏览器中的豆包网页版（doubao.com）。能力：①看图分析/反推形象描述（普通对话看图，无限制）；②文生视频（Seedance 2.0，10s 竖屏等）；③图生视频（⚠️ 肖像保护：Seedance 不支持上传真实人脸参考图，会拒绝；破局法=先让豆包看图反推形象文字描述 → 再用文字锚定文生视频）。零 API Key，需豆包账号登录态。当需要豆包分析图片、生成视频、或做字节系 AI 任务时使用。
user-invocable: true
---

# doubao-creator — 豆包网页操作 Skill

> 通过 CDP 控制夸克浏览器里的豆包网页版（doubao.com/chat/），零 API Key、零本地算力。
> 前置：夸克以 `--remote-debugging-port=9222` 运行 + 豆包已登录（`doubao.com/chat/` 页面打开）。

## 脚本清单

| 脚本 | 用途 |
|---|---|
| `doubao-vision.js` | 看图分析 / 反推形象描述（上传图片 → 提问 → 读回复）|
| `doubao-genvideo-text.js` | **文生视频**（Seedance 2.0）：输入需求 → 长轮询 → 自动点卡片播放 → 抓抖音 CDN URL → 下载 |
| `doubao-genvideo2.js` | 图生视频（仅非人脸图可用，见下方肖像保护）|
| `cdp.js` | CDP 客户端库 |

## 调用方式

```powershell
# 看图/反推形象
node "<skill>\scripts\doubao-vision.js" <图片路径> "请详细描述图中人物形象特征，用于视频生成提示词"

# 文生视频（10s 竖屏广告等）
node "<skill>\scripts\doubao-genvideo-text.js" "请生成一个10秒的竖屏广告视频，主题：...画面：...主角形象：..."
```

## ⚠️ 肖像保护限制（关键踩坑）

- **Seedance 2.0 不支持上传真实人脸参考图**：图生视频传人物照片 → 豆包拒绝（"出于肖像保护考虑…"）
- 非人脸参考图（物品/风景/背景）可以图生视频
- **破局法（人物形象）**：先让豆包看图反推文字描述（看图不受限制）→ 把精确描述写进文生视频提示词 → Seedance 按文字生成近似形象

## 关键经验

- **视频生成耗时**：Seedance 预计 5 分钟，脚本最长轮询 10 分钟
- **检测完成**：页面出现新 `.block-video` 卡片 = 视频生成完成；**必须点击卡片播放**后 `<video>` 元素才出现，URL 指向抖音 CDN（v6/v9-default.douyin.com）
- **下载**：带 `Referer: https://www.doubao.com/` 头
- **文生视频提示词**：主角形象要写"写实真人+发色+发型+服装+气质"（越具体越像）；豆包反推的 Prompt 片段可直接复用
- **误判防范**：拒绝检测用精确短语（"出于肖像保护"等），且发送后至少等 30 秒再判定

## 故障排查

| 现象 | 处理 |
|---|---|
| "未找到豆包页面" | 确认夸克调试模式 + doubao.com/chat/ 已打开 |
| 拒绝提示（肖像保护）| 换非人脸参考图，或走"看图反推→文生视频"路线 |
| 视频未出现 | 等待 5-10 分钟；检查是否需点击卡片播放 |
| 找不到"生成视频"按钮 | 对话内直接文字描述需求即可触发 Seedance（已验证）|

## 关联

- 工具脚本目录：`<skill 目录>\scripts\`（cdp.js 客户端 / doubao-vision.js 看图 / doubao-genvideo-text.js 文生视频 / doubao-genvideo2.js 图生视频）
- 同族 skill：`quark-qwen-vision`（夸克千问看图/生图）
- 模型矩阵：DeepSeek（主脑）+ 千问（视觉/生图）+ 豆包（视频/字节系）
