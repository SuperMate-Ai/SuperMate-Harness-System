---
name: multi-agent-orchestrator
description: 在线多智能体对话总指挥。DeepSeek 主脑通过 CDP 调度夸克浏览器里的千问（p.quark.cn/pcquark-chat/sidebar）与豆包（doubao.com/chat）等在线智能体，并行回答同一问题、收集数据，再提取结构化结果并用本地数据验证。支持文字/图片附件；视频走抽帧、音频暂不支持（转文字替代）。当用户要"让千问/豆包一起回答"、需要在线智能体收集资料/多视角答案、或要对比多家AI观点时使用。核心纪律：在线智能体只当"候选假设生成器"，最终结论必须经本地数据/回测裁决。
user-invocable: true
---

# 在线多智能体对话总指挥（multi-agent-orchestrator）

> 模型矩阵：**DeepSeek（主脑/裁决）** + 千问（视觉/生图/知识） + 豆包（字节系/视频/检索） + 可扩展其他在线智能体。
> 铁律：**智能体的回答是"假设"，不是"结论"**——必须落盘、提取、再用本地数据/脚本验证后才算数。

## 何时使用

- 用户想"让千问和豆包同时回答同一个问题"、对比多家 AI 观点
- 需要在线智能体联网收集资料、生成候选（如选股名单、资料综述、多视角分析）
- 问题带附件：文字/图片/视频/音频

## 依赖（已就绪）

| 组件 | 位置 |
|------|------|
| CDP 客户端 | `quark-qwen-vision/scripts/cdp.js`、`doubao-creator/scripts/cdp.js`（通用） |
| 千问提问/读回 | `quark-qwen-vision/scripts/ask-qwen.js`（发文字）、`check-qwen.js`（复查）、`read-qwen.js`（轮询）、`qwen-vision.js`（图片） |
| 豆包提问/看图 | `doubao-creator/scripts/ask-doubao.js`（发文字）、`doubao-vision.js`（图片） |
| 浏览器 | 夸克以 `--remote-debugging-port=9222` 运行；千问侧栏与豆包页面已打开 |

前置确认：`http://127.0.0.1:9222/json/list` 中能找到 `pcquark-chat` 与 `doubao.com` 页面。

## 总指挥工作流

```
1. 拆解任务 → 明确要给各智能体的"统一问题"（写入 logs\qwen_question.txt）
2. 并行派发：每个智能体一个后台 job 跑 node ask-*.js（同一问题文件）
3. 结果落盘：各智能体回复写入 logs\agent_<名>_<时间>.txt（原始全文不拉进对话）
4. 提取数据：只从回复中解析 表格/名单/要点（结构化部分），丢弃 UI 噪音
5. 本地验证：候选/结论用本地数据或脚本复核（例：validate_agents_pool.py 验证股票池）
6. 汇总交付：对比表 + 验证结果 + 结论；注明各智能体局限性
```

## 并行派发示例

```powershell
# 问题写入文件后，两个智能体各起一个后台任务同时回答：
node "…\quark-qwen-vision\scripts\ask-qwen.js"   "E:\…\logs\qwen_question.txt"   # 千问
node "…\doubao-creator\scripts\ask-doubao.js"    "E:\…\logs\qwen_question.txt"   # 豆包
```

## 附件适配矩阵

| 附件 | 千问侧栏 | 豆包 | 说明 |
|------|---------|------|------|
| 文字 | `ask-qwen.js <文件>` | `ask-doubao.js <文件>` | 问题写入 txt，规避命令行引号问题 |
| 图片 | `qwen-vision.js <图> <问题>` | `doubao-vision.js <图> <问题>` | 千问走 paste 事件；豆包走 DOM.setFileInputFiles |
| 视频 | 不支持直接粘贴 | 同上 | **ffmpeg 抽帧 → 拼图/选关键帧 → 当图片喂** |
| 音频 | 不支持 | 不支持 | 先 ffmpeg 转文字，再走文字通道（标注局限） |

## 读取回复的坑（实战踩坑记录）

- **锚点截取**：用"问题前 30-40 字"做锚点，只打印问题之后的回复；避免把历史对话拉进上下文
- **轮询稳定**：innerText 连续 4-5 轮无变化才算回复完成；长任务（如选股）可能 3-6 分钟，耐心轮询（read-qwen.js 支持多页面）
- **UI 噪音截断**：豆包回复尾部截到"豆包 快速"等 UI 标记；千问侧栏 innerText 可能混入当前网页标题/上下文——**提取时只信表格与结构化部分**
- **千问侧栏"深度思考"可能超时**：>6 分钟无结果不要傻等，改用 `check-qwen.js` 复查或放弃该路
- **多页面歧义**：pcquark-chat 可能有多个实例，用"问题锚点"定位真正收到提问的那个

## 数据提取约定（省 token 关键）

1. 智能体长回复**写文件**，对话里只放结构化摘要（表格、名单、结论）
2. 要求智能体输出"表格/编号清单"，方便正则/规则提取
3. 提取后的候选必须过本地验证脚本，输出只留"验证后"的结果

## 本地验证（裁决层）

- 股票类候选：`scripts/validate_agents_pool.py`（是否成分股 + 箱体/趋势/波动达标）或 `box_scan_3y.py`
- 数据类结论：对照本地 data/ 与脚本结果
- 预测类：一律概率化 + trade-journal 复盘

## 实战复盘（2026-08-29 网格选股）

- 千问 10 只 + 豆包 14 只，**两份名单完全无交集** → 在线智能体只适合粗筛
- 千问市值数据有硬伤（华能国际/大秦铁路实为千亿级，标注 ~180 亿）
- 本地三重验证：24 候选 → 8 只在成分股 → **2 只达标**（601139 深圳燃气 / 600998 九州通）
- 教训固化：**多智能体 = 快速生成假设 + 交叉视角；裁决永远用本地数据**

## 关联技能

- `quark-qwen-vision`（千问通道）· `doubao-creator`（豆包通道）· `quant-data`（本地数据）· `astock-*`（分析裁决）
