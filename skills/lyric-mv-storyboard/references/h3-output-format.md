# H3 输出格式与防变脸通道（h3-output-format.md）

## 一、模式选择（按参考情况）

| 参考情况 | H3 模式 | 正文结构 |
|---|---|---|
| 无参考图（纯文生） | **T2VA** | 三核心字段（无首行指令） |
| 有角色板/首帧图（单张，作字面第一帧） | **I2VA** | 首帧指令行 + 三核心字段 |
| 角色板+场景板多参考（MV 主力，锁身份） | **Ref2VA** | 六段式 |
| 首尾帧续拍（多镜头拼接续段） | **FL2VA** | 对齐指令行 + 三核心字段 |

## 二、三核心字段（T2VA/I2VA/FL2VA/L2VA）

```text
（I2VA/FL2VA/L2VA 先写对应对齐指令行，后接空行）
integrated_multimodal_description: [Shot 1] ...（沿时间轴：风格/初始构图/主体外观位置/场景道具/动作反应/镜头变化/说话者/对白/同期声）
overall_soundscape: ...（环境音/物理动作声/非语言人声，1-4 句）
non_diegetic_music: ...（观众才听得见的 BGM：配器/速度/节奏/动态，1-3 句）
```

- `[Shot 1]` 开头写风格与初始构图（Cinematic / live-action / 2D-animated / watercolor / ink-wash...）；
  后续镜头 `[Shot 2] At MM:SS.mmm, the camera cuts to ...`；第一镜不加时间戳。
- 运镜写自然英文（类型+幅度+速度）：`The camera pushes in with small amplitude at slow speed toward her hands.`
- 演唱/对白：`<Subject 1> (S1) sings, <d>[Chinese] 长亭外</d>`；逐字保留原文；
  画外音用 `says in an off-screen voiceover` 并注明 `while his lips remain completely closed`。
- 画面可见文字（字幕/招牌）用英文双引号保留原文。
- 首镜必须声明运动起点（RH I2V 铁律）：`第0帧起画面即处于运动中，禁止静态开场`。

## 三、Ref2VA 六段式（MV 主力）

```text
subject_definitions:
<Subject 1> is the woman in <Picture 1>, with [身份锚点全量复述].
<Subject 2> is the night street environment in <Picture 2>, with [场景锚点].
<Picture 1> is the character reference board.
<Picture 2> is the location plate of the night street.

summary:
[reference generation] The target video shows <Subject 1> standing in <Subject 2> ...

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - ...
<Subject 2> (appears in [Shot 1]): fully_preserved - ...

detailed_description:
The target video is in a cinematic, melancholic MV style with cool blue-grey tones and soft film grain.
[Shot 1] ...

overall_soundscape:
...

non_diegetic_music:
...
```

- 标签全片一致；`<Subject N>` 可复用内容，`<Picture N>` 帧/参考锚点；
- `retention_analysis` 用固定标记：fully_preserved / partially_preserved / attribute_transfer / weak_reference；
- `detailed_description` 350-500 英文词，对白密集时优先装下完整演唱时间线；
- 写前读 `h3-prompt-writing/references/ref-en.txt` 保证字段精确。

## 四、全局合并提示词（输出最后一部分）

```text
[GLOBAL LOCK] Cinematic MV, 16:9, 35mm film grain, cool blue-grey palette fading to warm amber,
soft diffused lighting. Character identity locked: <身份锚点全量复述>. Master audio: 原曲音轨.
Then per-shot H3 prompts concatenated along the timeline (Shot 1 → Shot N).
```

用途：一键粘贴给支持全局+分段输入的通道（本地 H3 / RH）；豆包 Seedance 无参考时
把 [GLOBAL LOCK] 压缩成一段中文需求（含角色文字锚定）走文生视频。

## 五、防变脸通道（生产）

| 情形 | 通道 | 操作 |
|---|---|---|
| 有角色板（Z-Image 已出） | RH H3 **Ref2VA**（16:9，workflow 2085980820623413250） | `run_i2v_workflow.py --workflow-id 2085980820623413250 --image 角色板.png --resize-max 1280 --prompt <H3正文> --duration N` |
| 竖屏（9:16）有首帧 | RH H3 **I2V**（workflow 2085953821150367746） | 同上（默认 workflow）；提示词首句声明 0 帧即运动 |
| 无参考、10s 竖屏 | 豆包 **Seedance 2.0** 文生视频 | `node doubao-genvideo-text.js "<需求>"`；真人脸参考不能上传，用文字锚定 |
| 角色板生成 | 本地 **Z-Image** | `comfyui_generate`：正面半身、灰/白背景、无场景、竖屏 720×1280、steps 8、cfg 1 |
| 拼接/音轨 | **ffmpeg** | trim + concat + 统一 LUT/颗粒 + 音频对齐 |

铁律：参考图只缩放到最长边 1280px，**绝不裁剪**（RH）；参考图控制边界写进
`reference_bindings`（角色板 may_control=身份/造型，must_not_control=构图/动作/背景）。

## 六、输出规范

- 禁止特殊符号；标点只使用中英文标准标点；
- 可复制正文不含占位符/文件路径/QA 结论/流程说明；
- outputMode=markdown：分镜表 + 全局合并提示词；
  outputMode=raw：结构化数组（见 examples/real-lyric-run.md 的 raw 示例节）。
