# drama-skills 评估与 Harness 适配报告

> 评估对象：`github_data/drama-skills`（zenstory-ai/drama-skills，10 技能短剧创作套件）
> 结论：**值得优化，且已优化落地为 Harness 通用视频制作 skill：`video-production-studio`**
> 产出位置：`E:\Harness Workspace\.dsh\skills\video-production-studio\`

---

## 一、总体评价

这是一套质量相当高的 Agent Skill 套件：不是"提示词模板堆"，而是把一间漫剧工作室上千个项目的
工程经验蒸馏成了**文件即真相的创作工作流**（五份 Markdown）、**确认闸门**（preview → confirm → run）、
**连续性纪律**（身份 vs 变体、稳定 ID、参考图控制边界）和**按需加载的知识库**（每阶段只读一份 reference）。
它适配 Claude Code/Codex 的 Agent Skills 规范，格式（SKILL.md + YAML frontmatter name/description）
与 DSH 的 skill 加载器天然兼容（DSH 额外支持 whenToUse/invocation 字段，多余字段如 license 被忽略）。

但它**不是**开箱即用的 Harness 通用视频 skill，主要有四类差距（见下）。

## 二、值得保留的优点

| 优点 | 说明 |
|---|---|
| creator-first 五文档 | `剧本/视觉设定/分镜/图片提示词/视频提示词` 五份 Markdown 即创作真相；不预建空文件；无并行生命周期账本 |
| 生产确认闸门 | 每次生产四步：有边界 job → 展示精确预览 → 用户看过预览后明确确认 → 执行；任何变化失效旧确认，失败重试须新确认 |
| 连续性纪律 | 身份 vs 变体 vs 镜头瞬态；`SHOT-/IMG-/MOTION-/REF-` 稳定 ID；参考图「控制/不得控制」边界；冻结关键帧只投影起点 |
| 视频运动语法 | 静态锚点 → 起点 → 触发 → 动作 → 反应 → 运镜 → 声音 → 可验证终点；一镜一个主变化；不跨镜、无瞬移 |
| 按需知识加载 | 每阶段只读一份 reference 的模式极大节省上下文，值得沿用 |
| 审查方法论 | 证据化 finding（位置/证据/影响/修订结果/owner/严重度），结论 APPROVE/REVISE 分级 |
| 规则分级 | structural_invariant / reviewed_invariant / craft_default / taste_option，避免把格式偏好冒充普遍规律 |
| 所有权边界 | 每阶段只拥有自己名下的文件，不越权改写上游 |

## 三、主要问题与 Harness 不兼容点

1. **10 技能碎片化**：跨 skill `$short-drama-*` 引用 + 路由复杂度；DSH 里每个目录是一个 catalog
   条目，10 个入口对"通用视频制作"太重。
2. **python3 强依赖**：project_tool.py / production_tool.py / selftest / dashboard_server /
   novel_index 等几乎每个技能都要 python3 命令；Windows 上还得 `py -3`，且这些校验器是"流程闸门"
   而非创作价值，普通创作反而被拖慢。
3. **外部云端 adapter**：生产层绑定 Seedance / GPT Image 2 / MiniMax Music 三家云端 API +
   provider_adapters.py；Harness 的本地通道是 ComfyUI Z-Image、RH H3、本地 H3、豆包 Seedance，
   与之一一不对应。
4. **短剧专属词汇**：漫剧关键帧词表、竖屏短剧构图、题材卡、原著拆书流水线（novel_index/
   episode_intake 的复杂索引与 publish 生命周期）对"通用视频"是噪声。
5. **Dashboard**：自带 Web 创作台（dashboard_server.py）与 Harness GUI 重复，且违背"文件即真相"。

## 四、优化决策（做了什么）

| 决策 | 做法 |
|---|---|
| 10 → 1 合并 | 新建单一 skill `video-production-studio`，内部按阶段路由（剧本→资产→图片提示词→分镜→视频提示词→生产→审查） |
| 泛化 | 去掉漫剧/竖屏专属词汇，覆盖短剧/漫剧/口播/广告/科普/MV/产品演示；系列剧与单条短片两种形态 |
| H3 融合 | 视频提示词输出统一为 **MiniMax H3 原生格式**（T2VA/I2VA/FL2VA/L2VA/Ref2VA，字段名/顺序/标签与 h3-prompt-writing 完全一致），正文可直接粘贴到 H3 工作流/RH 通道 |
| 通道替换 | 生产层映射到 Harness 本地工具链：Z-Image（comfyui_generate）、RH H3 Ref2VA/I2V（rh-workflow）、豆包 Seedance（doubao-creator）、本地 H3 口播（h3-video-producer）、Ollama 质检（analyze_image）、ffmpeg 合成 |
| 去 python3 | 快乐路径零脚本依赖；保留关键参数/铁律进 references/harness-channels.md |
| 保留精华 | 五文档格式、确认闸门、连续性纪律、运动语法、审查 rubric、按需知识加载、规则分级 |
| 精简 | 丢弃 dashboard、publish 生命周期、原著拆书流水线、JSONL 账本类产物（保留为可选分集规划分支） |

## 五、逐技能适配清单

| 原技能 | 去向 |
|---|---|
| short-drama（路由/初始化/Dashboard） | → 新 skill 的阶段速查表与目录规范；Dashboard 弃用 |
| short-drama-novel-analyze / develop | → 压缩为"项目开发"可选分支（定位简报+分集地图）并入 craft-script.md |
| short-drama-write | → 主 skill ① 剧本 + references/craft-script.md |
| short-drama-assets | → 主 skill ② 资产 + references/craft-assets-prompts.md |
| short-drama-image-prompts | → 主 skill ③ 图片提示词 + 同 reference（Z-Image 参数） |
| short-drama-storyboard | → 主 skill ④ 分镜 + references/craft-storyboard-motion.md |
| short-drama-video-prompts | → 主 skill ⑤ 视频提示词，正文改为 H3 原生（融合 h3-prompt-writing） |
| short-drama-produce | → 主 skill ⑥ 生产闸门 + references/harness-channels.md（本地通道映射） |
| short-drama-review | → 主 skill ⑦ 审查 + references/review-rubric.md |
| 全部 scripts/*.py | → 弃用（快乐路径零依赖）；保留的可执行知识进 harness-channels.md |
| 全部 agents/openai.yaml | → 弃用（DSH 不读） |
| maintainers/short-drama-knowhow | → 精华并入各 craft-*.md |

## 六、新 skill 目录结构

```text
.dsh/skills/video-production-studio/
├── SKILL.md                          # 主技能：定位/路由/七阶段规范/生产闸门/通道表/自检
└── references/
    ├── stage-contract.md             # 阶段边界、所有权、规则分级、ID 契约
    ├── creator-documents.md          # 五文档格式规范（含真实示例结构）
    ├── craft-script.md               # 故事引擎/节拍/剧本/对白手艺
    ├── craft-assets-prompts.md       # 资产拆解 + 图片提示词配方 + Z-Image 执行
    ├── craft-storyboard-motion.md    # 分镜/关键帧 + 视频运动纪律 + H3 写法
    ├── harness-channels.md           # 本地通道接线（Z-Image/RH/豆包/本地H3/质检/合成）
    └── review-rubric.md              # 审查方法与各范围 rubric
```

## 七、验证与后续可选优化

- 已验证：DSH skill 目录已实时发现新 skill（catalog 已出现 `video-production-studio`）；
  frontmatter name/description 合法。
- 后续可选：
  1. 跑一个真实样例（如把《让你管账号》EP001 五文档转成 H3 原生提示词并实际出片）做端到端验证；
  2. 如需要，把"原著拆书"流水线以可选子 skill 形式补回；
  3. 如需要，给生产层补一个极简 job JSON 模板（可选项，不设 python 依赖）。
