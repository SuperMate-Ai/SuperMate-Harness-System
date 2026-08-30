# H3 融合示例：从五文档到 H3 原生提示词（example-h3-fusion.md）

用《让你管账号》EP001 真实条目演示融合写法：分镜/视频提示词文档保持 drama-skills 的
`MOTION-*` 条目结构（元数据 + 可复制正文），但**可复制正文 = H3 原生提示词**，可直接执行。

## 示例 A：无参考图 → T2VA

来源条目（分镜 SHOT-EP001-002「把空白交到他手里」，8s，文生视频）：

```text
- 静态视觉锚点：A broad square-faced middle-aged East Asian officer sits frame right and a lean
  young East Asian man in olive-green service dress sits frame left across a glass-covered desk in
  an old office lit from the left.
- 起始帧：周薄森右手压住材料，江晨手停在桌边。
- 终点：材料抵住江晨指尖，周薄森把茶缸放回旧茶渍。
```

融合后 `### 可复制提示词` 正文（T2VA 三核心字段）：

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, a medium-wide shot frames a
broad square-faced middle-aged East Asian officer (S1) seated frame right and a lean young East
Asian man in olive-green service dress seated frame left across a glass-covered desk in an old
office lit from the left. The middle-aged officer (S1), with a calm, businesslike voice, pushes a
paper stack about twenty centimeters across the glass desk and says: <d>[Chinese] 江晨同志，欢迎
加入我们文工团。</d> The young man keeps his hands at the desk edge until the paper touches his
fingertip. The officer then lifts the chipped enamel mug for one small sip, frowns at the cold
tea, and returns it exactly to the old tea ring. The camera holds a static shot throughout.
Preserve both seated positions, uniforms, file-box wall and left-window light; no object
duplication, no camera movement.

overall_soundscape: Low office room tone with the soft scrape of paper sliding across glass, one
small sip from the enamel mug, and the mug clicking back onto the tea ring.

non_diegetic_music: N/A
```

对照要点：静态锚点成为 `[Shot 1]` 的开场构图；起点→触发→动作→终点写进
`integrated_multimodal_description`；说话者编号 (S1) + `<d>[Chinese] 原文</d>`；禁止项保留；
`overall_soundscape` 只写环境与物理声；无配乐写 N/A。

## 示例 B：多参考（角色+场景）→ Ref2VA 六段式（系列剧主力）

输入：角色板（江晨）、场景板（文工团办公室）、动作意图（跨集锁身份）。

```text
subject_definitions:
<Subject 1> is the young man in <Picture 1>, with a lean long face, high brow ridge, deep-set
eyes, short cropped black hair and olive-green service dress.
<Subject 2> is the office environment in <Picture 2>, with an old wooden desk, glass desktop,
blue-grey file cabinets and left-window daylight.
<Picture 1> is the character reference board of the young man.
<Picture 2> is the location plate of the old office.

summary:
[reference generation] The target video shows <Subject 1> entering <Subject 2> and reporting to
the officer, using <Picture 1> to lock identity and <Picture 2> to lock the environment.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - facial features, haircut and olive-green
service dress are retained.
<Subject 2> (appears in [Shot 1]): fully_preserved - desk, glass top, file cabinets and daylight
direction are retained.

detailed_description:
The target video is in a cinematic live-action style with natural indoor light.
[Shot 1] A medium-wide shot establishes <Subject 2>, the old office with its wooden desk, glass
desktop, blue-grey file cabinets and left-window daylight. <Subject 1>, the young man with the
lean face and olive-green service dress from <Picture 1>, stands before the desk, heels together,
and salutes crisply. The camera pushes in with small amplitude at slow speed as he lowers his arm
and meets the officer's gaze with restrained eagerness. His lips remain mostly closed; only a
quiet breath is audible.

overall_soundscape:
Quiet indoor room tone with the rustle of a uniform and a single soft footstep.

non_diegetic_music:
A restrained low-string underscore at a slow tempo, swelling slightly at the salute and fading
out.
```

对照要点：`<Subject N>` 负责可复用身份/场景，`<Picture N>` 指向实际参考图文件；
`retention_analysis` 用固定标记；`detailed_description` 开头先定风格再 `[Shot 1]`；
全片标签一致，进入生产时 `<Picture 1>/<Picture 2>` 一一对应 job 的 reference_bindings。
