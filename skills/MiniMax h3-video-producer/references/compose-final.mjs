/**
 * compose-final.mjs — 本地成片合成器（h3-video-producer Skill 引用）
 *
 * 三模式：full 全屏主持人 / pip 主画面+左下角正圆羽化小窗 / vo 纯画外音（图表缓慢推镜）
 * 硬切拼接 + ASS 字幕（白字、核心词黄高亮、按标点硬换行避让小窗）+ 结尾淡出 + 音频限幅。
 *
 * 配置：修改下方 CONFIG 后运行 `node compose-final.mjs`
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { existsSync, writeFileSync, mkdirSync } from 'node:fs'

const CONFIG = {
  root: '.',                                    // 项目根
  segDir: 'segments',
  assetDir: 'assets',
  tmpDir: 'blocks',
  final: 'final.mp4',
  width: 1280,
  height: 720,
  pipH: 103,            // 小窗高（画面 1/6~1/7）
  pipX: 16,             // 左下角边距（参考图：紧贴边缘）
  pipY: 0,              // 0 = 自动 = H - pipH - 16
  feather: 6,
  dialogue: {},         // { seg: 台词 }
  highlight: ['deepseek-eyes', 'DeepSeek', 'Token', '80%', 'DSH', 'GitHub', 'Star', 'AI'],
  blocks: [             // mode: full | pip | vo
    // { name, seg, mode, asset, from, to }
  ],
}

const ROOT = CONFIG.root
const SEG = join(ROOT, CONFIG.segDir)
const AST = join(ROOT, CONFIG.assetDir)
const TMP = join(ROOT, CONFIG.tmpDir)
const FINAL = join(ROOT, CONFIG.final)
const W = CONFIG.width, H = CONFIG.height
const PIP_H = CONFIG.pipH
const PIP_X = CONFIG.pipX
const PIP_Y = CONFIG.pipY || H - PIP_H - 16
const FEATHER = CONFIG.feather
const blocks = CONFIG.blocks
const DIALOGUE = CONFIG.dialogue
const HIGHLIGHT = CONFIG.highlight

const maskFilter = () => `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(hypot(X-W/2,Y-H/2),min(W,H)/2-${FEATHER}),255,if(lt(hypot(X-W/2,Y-H/2),min(W,H)/2),(min(W,H)/2-hypot(X-W/2,Y-H/2))*255/${FEATHER},0))'`

function segPath(n) { return join(SEG, n, `${n}.mp4`) }
function segDur(n) { return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', segPath(n)], { encoding: 'utf8' }).trim()) }

mkdirSync(TMP, { recursive: true })
const blockDurs = []
for (const b of blocks) {
  const p = segPath(b.seg)
  if (!existsSync(p)) throw new Error(`缺 ${b.seg}`)
  const full = segDur(b.seg)
  const len = b.to ? b.to - b.from : full - b.from
  const out = join(TMP, `${b.name}.mp4`)
  const ss = b.from > 0 ? ['-ss', String(b.from)] : []
  const frames = Math.max(1, Math.round(len * 24))
  if (b.mode === 'vo') {
    const f = `[0:v]scale=${Math.round(W * 1.5)}:${Math.round(H * 1.5)}:force_original_aspect_ratio=increase,crop=${Math.round(W * 1.5)}:${Math.round(H * 1.5)},zoompan=z='min(1+0.0009*on,1.10)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=24,format=yuv420p,setsar=1[v]`
    execFileSync('ffmpeg', ['-y', '-i', join(AST, b.asset), '-i', p, '-filter_complex', f, '-map', '[v]', '-map', '1:a?', '-t', String(len), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', out], { stdio: 'ignore' })
  } else if (b.mode === 'pip') {
    const f = [
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=24,setsar=1[base]`,
      `[1:v]crop=ih*0.6:ih*0.6:iw*0.55-ih*0.3:ih*0.45-ih*0.3,scale=${PIP_H}:${PIP_H},format=rgba,${maskFilter()},setsar=1[pip]`,
      `[base][pip]overlay=${PIP_X}:${PIP_Y}:shortest=1[v]`,
    ].join(';')
    execFileSync('ffmpeg', ['-y', ...ss, '-loop', '1', '-i', join(AST, b.asset), '-i', p, '-filter_complex', f, '-map', '[v]', '-map', '1:a?', '-t', String(len), '-r', '24', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', out], { stdio: 'ignore' })
  } else {
    execFileSync('ffmpeg', ['-y', ...ss, '-i', p, '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=24,setsar=1`, '-t', String(len), '-r', '24', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', out], { stdio: 'ignore' })
  }
  blockDurs.push(len)
  console.log(`block ${b.name} done (${len}s, mode=${b.mode})`)
}

// ASS 字幕
const total = blockDurs.reduce((a, b) => a + b, 0)
const YELLOW = '{\\c&H00FFFF&}'
const WHITE = '{\\c&HFFFFFF&}'
function assLine(text) {
  const mid = Math.floor(text.length / 2)
  let cut = -1
  for (let i = mid; i < text.length; i++) if ('。，！？'.includes(text[i])) { cut = i + 1; break }
  if (cut < 0) for (let i = mid - 1; i >= 0; i--) if ('。，！？'.includes(text[i])) { cut = i + 1; break }
  let t = cut > 0 && cut < text.length ? [text.slice(0, cut), text.slice(cut)].join('\\N') : text
  for (const k of HIGHLIGHT) t = t.replace(new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'), `${YELLOW}$1${WHITE}`)
  return t
}
const ts = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`
let ass = '[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Outline, Shadow, Alignment, MarginL, MarginR, MarginV\nStyle: Default,Microsoft YaHei,42,&H00FFFFFF,&H00000000,&H80000000,-1,2,1,2,200,60,52\n\n[Events]\nFormat: Layer, Start, End, Style, Text\n'
let t0 = 0
for (let i = 0; i < blocks.length; i++) {
  const t1 = t0 + blockDurs[i]
  const seg = blocks[i].seg
  if (DIALOGUE[seg]) ass += `Dialogue: 0,${ts(t0)},${ts(Math.min(t1, total - 0.05))},Default,,${assLine(DIALOGUE[seg])}\n`
  t0 = t1
}
writeFileSync(join(TMP, 'subs.ass'), ass, 'utf8')

// 最终装配：concat 滤镜 + 字幕 + 结尾淡出 + 限幅
const fadeDur = 0.8
const fadeStart = Math.max(0, total - fadeDur)
const inputs = []
const chain = []
blocks.forEach((b, i) => { inputs.push('-i', join(TMP, `${b.name}.mp4`)); chain.push(`[${i}:v][${i}:a]`) })
const concatF = `${chain.join('')}concat=n=${blocks.length}:v=1:a=1[catv][cata]`
const vf = `${concatF};[catv]ass=subs.ass,fade=t=out:st=${fadeStart}:d=${fadeDur}[v]`
const af = `[cata]afade=t=out:st=${fadeStart}:d=${fadeDur},alimiter=limit=0.9[a]`
execFileSync('ffmpeg', ['-y', ...inputs, '-filter_complex', `${vf};${af}`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', FINAL], { cwd: TMP, stdio: 'ignore' })
console.log('FINAL:', FINAL, `(${total.toFixed(1)}s)`)
