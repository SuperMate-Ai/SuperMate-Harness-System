# 真实歌词完整输出样例（real-lyric-run.md）

本文件是 `lyric-mv-storyboard` 的一次完整执行记录：输入《送别》（李叔同填词，公有领域），
LRC 时间轴 + BPM 估算双通道演示，输出时序分镜表、逐镜 H3 原生提示词、全局合并提示词、
防变脸 Ref2VA 变体与 raw 模式示例。可直接照此结构复用到任何歌词。

---

## 一、输入

```text
lyricText (LRC):
[ti:送别]
[ar:李叔同]
[00:03.00]长亭外
[00:06.50]古道边
[00:10.00]芳草碧连天
[00:17.00]晚风拂柳笛声残
[00:23.50]夕阳山外山
[00:29.00]天之涯
[00:32.50]地之角
[00:36.00]知交半零落
[00:42.50]一瓢浊酒尽余欢
[00:48.50]今宵别梦寒
[00:55.00]长亭外
[00:58.50]古道边
[01:02.00]芳草碧连天
[01:09.00]问君此去几时还
[01:15.00]来时莫徘徊
[01:20.00]天之涯
[01:23.50]地之角
[01:27.00]知交半零落
[01:33.50]人生难得是欢聚
[01:39.00]惟有别离多

musicStyle: 国风民谣 / 抒情
bpm: 72（拍长 0.83s，校准用；LRC 已提供精确时间轴）
globalMood: 怅惘怀旧、离别伤感，余韵从冷蓝灰走向暖黄
characterRef: 民国青年女子，鹅蛋脸，细眉，眼尾微垂，乌发盘髻，素色蓝灰旗袍，外披米白披肩，清瘦，气质温润清冷
aspectRatio: 16:9
outputMode: markdown
```

## 二、时间轴与分段（LRC 解析结果）

- 前奏 0:00–0:03（3s）：黑场淡入，环境建立；
- **主歌 A** 0:03–0:23.5：长亭外 / 古道边 / 芳草碧连天 / 晚风拂柳笛声残 / 夕阳山外山（场景建立，情绪压抑）；
- **主歌 B** 0:23.5–0:48.5：天之涯 / 地之角 / 知交半零落 / 一瓢浊酒尽余欢 / 今宵别梦寒（失衡→释放，全曲第一个小高峰）；
- **主歌 A′** 0:48.5–1:02：同景异态（夜色初上），表演节拍升级；
- **副歌/反问段** 1:02–1:20：芳草碧连天 / 问君此去几时还 / 来时莫徘徊（全曲情绪峰值）；
- **桥段** 1:20–1:33.5：天之涯 / 地之角 / 知交半零落（恍惚→决绝）；
- **尾声** 1:33.5–1:45：人生难得是欢聚 / 惟有别离多（回忆闪回 → 平静收束）；
- 尾奏 1:45–1:50（5s）：拉远淡出。

情绪曲线：平静 → 压抑 → 失衡 → 释放 → 压抑(升级) → 峰值 → 恍惚 → 决绝 → 释然。

## 三、时序分镜表

| 镜 | 时间 | 歌词原文 | 场景 | 运镜光影 | 人物表演（行动逻辑+节拍+面部时序） | 转场 | 提示词片段（模式） |
|---|---|---|---|---|---|---|---|
| P | 0:00–0:03 | （前奏） | 暮色长亭远景，逆光剪影 | 缓慢推近，暖金夕照 | 无人物 | 黑场淡入 | T2VA |
| 1 | 0:03–0:06.5 | 长亭外 | 长亭柱旁，中远景 | 固定机位，侧逆光 | 目标：等人；阻碍：未至；策略：静立远望。节拍：平静。时序：目光平直→微风拂发→缓缓眯眼 | 硬切 | T2VA |
| 2 | 0:06.5–0:10 | 古道边 | 古道伸向远方 | 缓慢横移，冷青调 | 无人物正面，落叶为笔。节拍：平静 | 运动衔接 | T2VA |
| 3 | 0:10–0:17 | 芳草碧连天 | 绿草连天，风过草浪 | 全景拉远，天光柔 | 背影静立。节拍：恍惚。时序：肩线微动→风掀披肩→停驻 | 硬切 | T2VA |
| 4 | 0:17–0:23.5 | 晚风拂柳笛声残 | 柳岸，近景侧脸 | 微推，黄昏逆光 | 目标：留住；阻碍：笛声将尽；策略：侧耳。节拍：失衡。时序：闻笛抬眼→眉间一蹙→下颌收紧 | 虚焦转场 | T2VA |
| 5 | 0:23.5–0:29 | 夕阳山外山 | 长亭前大远景，层山 | 缓慢拉远，橙金 | 剪影立于亭前。节拍：抑制 | 硬切 | T2VA |
| 6 | 0:29–0:32.5 | 天之涯 | 仰角天空 | 摇上，暮紫 | 无人物。节拍：恍惚 | 硬切 | T2VA |
| 7 | 0:32.5–0:36 | 地之角 | 低角度裙摆与石阶 | 固定，微仰 | 目标：迈步；阻碍：迟疑；策略：提裙又停。节拍：掩饰。时序：抬脚→悬停→放下收回 | 运动衔接 | T2VA |
| 8 | 0:36–0:42.5 | 知交半零落 | 亭柱旁，近景 | 缓推，青灰调 | 目标：确认；阻碍：人已散；策略：抚柱。节拍：抑制。时序：垂眸→指尖划过柱痕→喉结滚动 | 硬切 | T2VA |
| 9 | 0:42.5–0:48.5 | 一瓢浊酒尽余欢 | 石桌酒盏，中景 | 环绕半圈，烛暖 | 目标：敬别；阻碍：无解；策略：举杯。节拍：释放。时序：端杯→凝视酒面→仰饮 | 硬切 | T2VA |
| 10 | 0:48.5–0:55 | 今宵别梦寒 | 酒盏特写，烛光 | 微推，暖→冷过渡 | 目标：道别；阻碍：说不出口；策略：闭眼。节拍：释放→消退。时序：放盏→闭眼→一滴泪滑落→睁眼平视 | 淡入淡出 | T2VA |
| 11 | 0:55–0:58.5 | 长亭外（二） | 同景，夜色初上，月光 | 固定，月白冷调 | 节拍：平静（重启）。时序：睁眼→呼吸放平→望向月下长亭 | 淡入 | T2VA |
| 12 | 0:58.5–1:02 | 古道边（二） | 月下古道，薄雾 | 缓慢横移，冷蓝 | 无人物正面。节拍：平静 | 运动衔接 | T2VA |
| 13 | 1:02–1:09 | 芳草碧连天（二） | 夜色草浪，萤火 | 全景，深蓝 | 背影。节拍：恍惚（升级） | 硬切 | T2VA |
| 14 | 1:09–1:15 | 问君此去几时还 | 近景，面部 | 缓推，月光侧照 | 目标：问；阻碍：无人答；策略：开口欲言。节拍：失衡。时序：张唇→气声未出→唇瓣合拢 | 虚焦转场 | T2VA |
| 15 | 1:15–1:20 | 来时莫徘徊 | 特写，眼与唇角 | 固定，微光 | 目标：自答；阻碍：不舍；策略：摇头浅笑。节拍：掩饰。时序：摇头→苦笑→眼角微湿→别开脸 | 硬切 | T2VA |
| 16 | 1:20–1:23.5 | 天之涯（二） | 星空仰拍 | 摇上，深蓝紫 | 无人物。节拍：恍惚 | 硬切 | T2VA |
| 17 | 1:23.5–1:27 | 地之角（二） | 背影走向亭深处 | 跟拍，逆月 | 目标：离开；阻碍：留恋；策略：转身。节拍：决绝。时序：停步→深吸→转身迈步 | 运动衔接 | T2VA |
| 18 | 1:27–1:33.5 | 知交半零落（二） | 亭中背影，风卷落叶 | 缓拉，青灰 | 节拍：抑制。时序：肩线渐沉→袍角被风掀起→停驻 | 硬切 | T2VA |
| 19 | 1:33.5–1:39 | 人生难得是欢聚 | 回忆闪回：两人对坐饮茶 | 虚焦→对焦，暖黄 | 恍惚。时序：视线失焦→回忆叠化→微怔 | 虚焦转场 | T2VA |
| 20 | 1:39–1:45 | 惟有别离多 | 现实：独倚亭柱，望向镜头 | 固定，暖黄收束 | 目标：放下；阻碍：过往；策略：坦然对视。节拍：平静+决绝。时序：抬眼→目光柔和→微微颔首 | 硬切 | T2VA |
| C | 1:45–1:50 | （尾奏） | 长亭渐隐于暮色 | 拉远至大远景 | 剪影渐小 | 淡出黑场 | T2VA |

## 四、逐镜 H3 可复制正文（T2VA，可直接粘贴执行）

> 演唱人声统一编号 (S1)，歌词逐字 `<d>[Chinese] 原文</d>`；口型与歌词同步；全片 16:9、35mm 颗粒、墨彩调色。

### 镜 P（0:00–0:03）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, the video opens on a distant pavilion silhouette against a low amber sun over layered hills, thin mist drifting across the foreground grass. The camera pushes in with small amplitude at slow speed, revealing the thatched pavilion roof and a flagstone path leading toward the camera. No people yet. 35mm film grain, soft warm rim light.
overall_soundscape: Low wind across the grassland, a distant flute note fading, and faint fabric rustle from an unseen figure.
non_diegetic_music: A solo xiao (vertical flute) at a slow tempo over sparse guzheng plucks, entering softly as the camera pushes in.
```

### 镜 1（0:03–0:06.5）· 长亭外

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a medium-wide shot frames a young woman in a plain blue-grey qipao with a cream shawl standing beside the wooden pillar of an old pavilion at dusk. She holds a small cloth bundle in both hands at waist height, gaze level and calm, looking along the path into the distance. The camera holds a static shot. A breeze lifts a loose strand of hair across her cheek; she slowly narrows her eyes against the low sun. The young woman with a soft, restrained voice (S1) sings: <d>[Chinese] 长亭外</d>, lips and jaw moving in sync with the phrase, then closing gently.
overall_soundscape: Evening wind through pavilion eaves, distant birdsong, and the rustle of her shawl in the breeze.
non_diegetic_music: Sparse piano notes at a slow tempo with sustained low strings, gentle and unresolved.
```

### 镜 2（0:06.5–0:10）· 古道边

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a wide shot of an old dirt road receding to the horizon between autumn grass, leaves skittering across the stones in the wind. The camera trucks right with small amplitude at slow speed, the empty road stretching away. The young woman (S1) continues off-screen: <d>[Chinese] 古道边</d>, her voice carrying as the wind rises.
overall_soundscape: Wind rushing across open ground, dry leaves scraping along the stones, a single crow call in the distance.
non_diegetic_music: The xiao melody continues, joined by a low cello line.
```

### 镜 3（0:10–0:17）· 芳草碧连天

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a full shot from behind shows the young woman in the blue-grey qipao standing at the edge of a vast green meadow that meets the sky, wind combing waves through the grass. The camera pulls out with large amplitude at slow speed, her figure growing small against the endless green. Her shawl lifts and settles in the wind while she remains still. The young woman (S1) sings with a fading, wistful tone: <d>[Chinese] 芳草碧连天</d>.
overall_soundscape: Broad wind over the grassland, grass blades rustling in layered waves, her shawl snapping softly.
non_diegetic_music: Strings swell gently beneath the xiao, then thin out.
```

### 镜 4（0:17–0:23.5）· 晚风拂柳笛声残

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a close profile shot of the young woman beside a willow by the river, willow fronds swaying in the evening breeze. A distant flute melody sounds off-screen. The camera pushes in with small amplitude at slow speed as she turns her head slightly to listen, brow drawing together, jaw tightening for a moment. The young woman (S1) sings softly with restrained emotion: <d>[Chinese] 晚风拂柳笛声残</d>, her lips parting and closing slowly with the phrase.
overall_soundscape: Willow leaves rustling, the distant flute melody, water lapping against the bank.
non_diegetic_music: The flute melody thins and stops, leaving only sparse piano.
```

### 镜 5（0:23.5–0:29）· 夕阳山外山

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, an extreme wide shot shows the young woman as a small silhouette standing before the pavilion, the setting sun flaring gold over layered mountain ridges beyond. The camera pulls out with large amplitude at slow speed, isolating her against the enormous sky. Her shoulders are still, arms at her sides. The young woman (S1) sings across the wide space: <d>[Chinese] 夕阳山外山</d>.
overall_soundscape: Wind only, growing quieter as the shot widens.
non_diegetic_music: A long sustained low string note fading toward silence.
```

### 镜 6（0:29–0:32.5）· 天之涯

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a low-angle shot tilts up from the grass to a vast mauve evening sky, a single thin cloud stretched across it. The camera tilts up with small amplitude at slow speed. No people. The young woman (S1) sings off-screen with a hollow, faraway tone: <d>[Chinese] 天之涯</d>.
overall_soundscape: High wind thinning, an almost silent pause underneath.
non_diegetic_music: Sparse piano, one note per phrase.
```

### 镜 7（0:32.5–0:36）· 地之角

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a low fixed shot frames the hem of her blue-grey qipao and cream shawl above worn stone steps. She lifts one foot as if to step forward, holds it suspended, then lowers it and withdraws. The camera holds a static shot. The young woman (S1) sings with a catch in her breath: <d>[Chinese] 地之角</d>.
overall_soundscape: Fabric shifting, the soft scrape of her shoe against stone, wind through the eaves.
non_diegetic_music: Piano with a low cello drone, unresolved.
```

### 镜 8（0:36–0:42.5）· 知交半零落

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a close shot of the young woman beside the pavilion pillar, her fingertips tracing a worn scratch in the wood. The camera pushes in with small amplitude at slow speed as her gaze drops, throat moving once in a swallow, the corners of her mouth pressing down. The young woman (S1) sings low and slow: <d>[Chinese] 知交半零落</d>.
overall_soundscape: Fingertip scraping on old wood, her quiet breath, wind under the eaves.
non_diegetic_music: Solo cello at a slow tempo, low and warm.
```

### 镜 9（0:42.5–0:48.5）· 一瓢浊酒尽余欢

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a medium shot shows a stone table with a ceramic wine cup on the pavilion floor; the young woman kneels and lifts the cup with both hands. The camera arcs around her with small amplitude at slow speed as she looks into the wine, then drinks in one deliberate motion and lowers the cup. The young woman (S1) sings with rising warmth: <d>[Chinese] 一瓢浊酒尽余欢</d>.
overall_soundscape: The cup clinking softly against the stone, wine being swallowed, a small breath after drinking.
non_diegetic_music: Strings warm and rise slightly, then soften.
```

### 镜 10（0:48.5–0:55）· 今宵别梦寒

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a close-up of the ceramic wine cup set back onto the stone table in candlelight. The camera pushes in with small amplitude at slow speed as her hand rests beside the cup. Her eyes close, one tear rolls down her cheek, then she opens her eyes and looks level. The young woman (S1) sings with a breaking, hushed voice: <d>[Chinese] 今宵别梦寒</d>.
overall_soundscape: Candle wax hissing faintly, the cup settling on stone, one soft breath.
non_diegetic_music: Piano and cello fade into a held silence.
```

### 镜 11（0:55–0:58.5）· 长亭外（二）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, the same pavilion now under rising moonlight, cold blue tones. The young woman stands where she did before, eyes open, breathing leveling out. The camera holds a static shot. The young woman (S1) sings again with quiet resolve: <d>[Chinese] 长亭外</d>.
overall_soundscape: Night wind, crickets beginning, the pavilion eaves creaking softly.
non_diegetic_music: Sparse piano, cooler and more spacious.
```

### 镜 12（0:58.5–1:02）· 古道边（二）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, the old road under moonlight with thin mist rolling across the stones, leaves settling. The camera trucks right with small amplitude at slow speed. The young woman (S1) continues off-screen: <d>[Chinese] 古道边</d>.
overall_soundscape: Mist-dampened wind, distant insects, soft footsteps not visible in frame.
non_diegetic_music: The xiao returns, lower and slower.
```

### 镜 13（1:02–1:09）· 芳草碧连天（二）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a full shot of the young woman from behind in the night meadow, fireflies drifting above the grass under deep blue sky. The camera pulls out with large amplitude at slow speed. Her shawl moves in the wind as she stands motionless. The young woman (S1) sings with fuller voice: <d>[Chinese] 芳草碧连天</d>.
overall_soundscape: Night wind, firefly hum, grass rustling.
non_diegetic_music: Strings and piano together, the emotional peak beginning to build.
```

### 镜 14（1:09–1:15）· 问君此去几时还

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a close shot of the young woman's face in moonlight from the side. The camera pushes in with small amplitude at slow speed as she parts her lips as if to speak, only a breath escaping, then presses them closed. Her eyes glisten. The young woman (S1) sings the question with a held, trembling tone: <d>[Chinese] 问君此去几时还</d>, lips shaping each word then closing.
overall_soundscape: Her shallow breath, the wind holding still, one insect call.
non_diegetic_music: The full theme swells, strings and xiao together.
```

### 镜 15（1:15–1:20）· 来时莫徘徊

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, an extreme close-up on her eyes and the corner of her mouth. The camera holds a static shot. She shakes her head slightly, a sad smile forming, the corners of her eyes moistening, then she turns her face away. The young woman (S1) sings with a gentle, resigned tone: <d>[Chinese] 来时莫徘徊</d>.
overall_soundscape: A soft exhale close to the microphone, fabric shifting as she turns.
non_diegetic_music: The orchestra thins to piano and a lone cello.
```

### 镜 16（1:20–1:23.5）· 天之涯（二）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, the camera tilts up from the pavilion roof to a star field in deep indigo, the moon small and cold. The camera tilts up with small amplitude at slow speed. No people. The young woman (S1) sings off-screen, voice distant: <d>[Chinese] 天之涯</d>.
overall_soundscape: Near silence, high thin wind.
non_diegetic_music: One long piano note held across the shot.
```

### 镜 17（1:23.5–1:27）· 地之角（二）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a tracking shot follows the young woman from behind as she pauses at the pavilion steps, takes one deep breath, and turns to walk into the deeper shadows of the pavilion, moon behind her. The camera tracks forward at slow speed behind her. The young woman (S1) sings with quiet firmness: <d>[Chinese] 地之角</d>.
overall_soundscape: Footsteps on stone, her shawl sweeping, night wind.
non_diegetic_music: Low strings, steady and resolved.
```

### 镜 18（1:27–1:33.5）· 知交半零落（二）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a wide shot shows her silhouette inside the pavilion, dried leaves blowing across the floor. The camera pulls out with small amplitude at slow speed. Her shoulders gradually lower, shawl hem lifting in the wind. The young woman (S1) sings with quiet sorrow: <d>[Chinese] 知交半零落</d>.
overall_soundscape: Leaves scraping across the pavilion floor, wind through the pillars.
non_diegetic_music: The theme returns softly, fading.
```

### 镜 19（1:33.5–1:39）· 人生难得是欢聚

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, a memory flashback: two blurred silhouettes of a man and the young woman seated across a low table with tea, warm candlelight, in soft focus. The shot begins blurred, then focuses slightly; her gaze goes unfocused as if remembering. The camera holds a static shot. The young woman (S1) sings with tender distance: <d>[Chinese] 人生难得是欢聚</d>.
overall_soundscape: Muffled warm room tone, teacup chime, the memory faintly layered under the wind.
non_diegetic_music: Warm piano arpeggios, nostalgic, then thinning.
```

### 镜 20（1:39–1:45）· 惟有别离多

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, back in the present, the young woman leans against the pavilion pillar facing the camera, soft warm light now rising at the horizon behind her. The camera holds a static shot. She meets the lens, her gaze softening, and gives a small nod. The young woman (S1) sings the final line with calm acceptance: <d>[Chinese] 惟有别离多</d>, closing her lips gently at the end.
overall_soundscape: Dawn birds begin, wind easing, the pavilion creaking once.
non_diegetic_music: Piano and strings resolve on a warm major chord, slowly fading.
```

### 镜 C（1:45–1:50 · 尾奏）

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, ink-wash-toned MV style, the camera pulls out with large amplitude at slow speed to an extreme wide shot, the pavilion and its small figure shrinking into the vast dawn landscape, mist closing in. The image fades to black in the final second.
overall_soundscape: Wind, then silence.
non_diegetic_music: The final chord decays into silence.
```

## 五、全局合并提示词（一键粘贴）

```text
[GLOBAL LOCK] Cinematic ink-wash-toned MV, 16:9, 35mm film grain, color grade from cool blue-grey to warm amber across the timeline, soft diffused light. Character identity locked: young woman in a plain blue-grey qipao with a cream shawl, oval face, slender arched brows, gently drooping eyes, hair in a low bun, slim and elegant, warm but reserved temperament. Master audio: the original song track, aligned to the LRC timeline. Hard cuts on beats; no fades except intro/outro and the flashback.

Then per-shot prompts concatenated: Shot P (00:00–00:03) → Shot 20 (01:39–01:45) → Shot C (01:45–01:50), each in the T2VA format above.
```

## 六、防变脸增强变体（可选，推荐生产用）

先用 Z-Image 出角色板（`comfyui_generate`：正面半身，米白背景，16:9，无场景），
第 1 镜改 **Ref2VA** 锁身份（其余镜头沿用同一角色板）：

```text
subject_definitions:
<Subject 1> is the young woman in <Picture 1>, with an oval face, slender arched brows, gently
drooping eyes, hair in a low bun, a plain blue-grey qipao with a cream shawl, slim and elegant.
<Picture 1> is the character reference board of the young woman.

summary:
[reference generation] The target video shows <Subject 1> standing beside the pavilion pillar,
using <Picture 1> to lock facial identity and costume.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - facial features, low bun, blue-grey qipao and
cream shawl are retained.

detailed_description:
The target video is in a cinematic ink-wash-toned MV style with 35mm film grain and warm dusk
lighting. [Shot 1] A medium-wide shot establishes <Subject 1>, the young woman in the blue-grey
qipao, standing beside the pavilion pillar holding a small cloth bundle, gaze level toward the
distance. The camera holds a static shot as a breeze lifts a strand of hair across her cheek. The
young woman (S1) sings in a soft, restrained voice: <d>[Chinese] 长亭外</d>, lips and jaw moving
in sync with the phrase, then closing gently.

overall_soundscape:
Evening wind through pavilion eaves, distant birdsong, the rustle of her shawl.

non_diegetic_music:
Sparse piano notes at a slow tempo with sustained low strings, gentle and unresolved.
```

生产：`run_i2v_workflow.py --workflow-id 2085980820623413250 --image 角色板.png --resize-max 1280 --prompt "<上面正文>" --duration 3.5`；
`reference_bindings`：角色板 may_control=身份/造型，must_not_control=构图/动作/背景。

## 七、raw 输出示例（outputMode=raw，节选 3 镜）

```json
[
  {"id": "shot-01", "start": 3.0, "end": 6.5, "lyric": "长亭外",
   "scene": "长亭柱旁中远景，黄昏侧逆光",
   "camera": "static; push-in omitted",
   "performance": {"goal": "等人", "obstacle": "未至", "strategy": "静立远望",
                   "beat": "平静", "face": "目光平直→微风拂发→缓缓眯眼"},
   "transition": "hard-cut",
   "h3_mode": "T2VA",
   "prompt": "integrated_multimodal_description: ...（同镜 1 正文）"},
  {"id": "shot-10", "start": 48.5, "end": 55.0, "lyric": "今宵别梦寒",
   "scene": "石桌酒盏特写，烛光暖→冷过渡",
   "camera": "push-in small amplitude slow speed",
   "performance": {"goal": "道别", "obstacle": "说不出口", "strategy": "闭眼",
                   "beat": "释放→消退", "face": "放盏→闭眼→一滴泪滑落→睁眼平视"},
   "transition": "fade",
   "h3_mode": "T2VA",
   "prompt": "integrated_multimodal_description: ...（同镜 10 正文）"},
  {"id": "shot-20", "start": 99.0, "end": 105.0, "lyric": "惟有别离多",
   "scene": "现实独倚亭柱，暖黄收束",
   "camera": "static shot",
   "performance": {"goal": "放下", "obstacle": "过往", "strategy": "坦然对视",
                   "beat": "平静+决绝", "face": "抬眼→目光柔和→微微颔首"},
   "transition": "hard-cut",
   "h3_mode": "T2VA",
   "prompt": "integrated_multimodal_description: ...（同镜 20 正文）"}
]
```

## 八、本次执行自查

- [x] LRC 时间轴解析 + 间奏识别（无 >2.5s 空白，间奏按段间呼吸处理）
- [x] 每句一个主导表演节拍，跟随情绪曲线（平静→压抑→失衡→释放→峰值→决绝→释然）
- [x] 副歌/重复句第二遍视觉与节拍升级（镜 11-13 vs 镜 1-3）
- [x] 每镜一个主运镜且有叙事理由
- [x] 全部 22 段 H3 正文：字段名/顺序/`<d>` 标签符合 h3-prompt-writing
- [x] 演唱 (S1) 编号统一，口型同步，歌词逐字保留
- [x] 防变脸：characterRef → 身份锚点 → 可选角色板 → Ref2VA 变体
- [x] 无特殊符号，标点符合规范
