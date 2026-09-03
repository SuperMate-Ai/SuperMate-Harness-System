/**
 * Image-to-text translation for the DeepSeek adapter.
 *
 * The DeepSeek chat-completions wire is text-only, but the host lets the
 * user attach images to any session whose model declares image input. This
 * module is how the adapter honours that declaration without a multimodal
 * wire: every durable image reference in the request history is translated
 * into a short structured text description before serialization. The
 * translation is performed by an external vision channel (the Quark Qwen
 * sidebar via CDP by default — zero local VRAM/token cost) and cached per
 * attachment id for the lifetime of the process, so a repeated image costs
 * one translation.
 *
 * A failed channel never blocks the conversation: the image degrades to a
 * placeholder line that names the durable attachment, keeping the request
 * admissible (the original bytes stay in the attachment store).
 *
 * @module @deepseek-ai/dsh-llm-deepseek/vision-translate
 */

import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Local structural view of a durable image reference. Kept local so this
 * package (which owns no dsh-attachment dependency) only needs the shape,
 * never the seam: values arriving here are the real `ImageAttachmentRef`
 * objects from the message content, and TS structural typing accepts them.
 */
export interface ImageRefLike {
  attachmentId: string
  mediaType: string
  bytes: number
  width: number
  height: number
  name?: string
}

/** Stored image bytes returned by the injected reader. */
export interface StoredImageLike {
  ref: ImageRefLike
  data: Uint8Array
}

/** Contract for reading durable image bytes (injected by the plugin). */
export type ReadImage = (ref: ImageRefLike) => Promise<StoredImageLike>

/**
 * Contract for the external vision channel: turn image bytes into a
 * structured description. Injected so tests can stub it and deployments can
 * point at a different channel.
 */
export interface VisionTranslator {
  /** Short diagnostic name ("quark-qwen-sidebar", "mock", …). */
  readonly label: string
  translate(image: { ref: ImageRefLike; data: Uint8Array }): Promise<string>
}

/**
 * Translate image-bearing content blocks into text for a text-only wire.
 * Recurses through user messages (including tool results that carry images).
 * Cached per attachment id; a missing channel or read failure degrades to a
 * placeholder line instead of failing the request.
 *
 * SERIAL, not parallel: the default channel is the Quark Qwen sidebar, a
 * web-session surface where concurrent pastes into the same page corrupt each
 * other. Translating one image at a time keeps each paste/reply pair isolated
 * even though it costs wall-clock time for multi-image messages.
 */
export async function translateContentBlocks(
  blocks: readonly { type: string }[],
  translateImage: (attachment: ImageRefLike) => Promise<string>,
): Promise<{ type: string }[]> {
  const out: { type: string }[] = []
  for (const block of blocks) {
    if (block.type === 'text') {
      out.push(block)
      continue
    }
    if (block.type === 'image') {
      const image = block as { type: 'image'; attachment: ImageRefLike }
      const slot: { type: 'text'; text: string } = { type: 'text', text: '' }
      out.push(slot)
      try {
        slot.text = await translateImage(image.attachment)
      } catch (error: unknown) {
        slot.text = `[用户上传图片未能自动描述（附件 ${String(image.attachment.attachmentId)}）：${error instanceof Error ? error.message : String(error)}]`
      }
      // Cooldown between images: the sidebar is a web session that needs a
      // moment to settle before the next paste, or it stalls under a burst.
      await new Promise(resolve => setTimeout(resolve, 1500))
      continue
    }
    // tool-result and other merge-extensible blocks pass through untouched.
    out.push(block)
  }
  return out
}

/** Resolve the per-block translator for one message list. */
export async function translateMessages(
  messages: readonly unknown[],
  readImage: ReadImage | undefined,
  translator: VisionTranslator,
  cache: Map<string, string>,
): Promise<unknown[]> {
  const translateImage = async (attachment: ImageRefLike): Promise<string> => {
    const key = String(attachment.attachmentId)
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    if (readImage === undefined) {
      // No byte seam: nothing to do but name the attachment. Cache it — the
      // absence is structural, not transient.
      const structural = `[用户上传图片（${attachment.mediaType}，附件 ${key}）——当前离线识图通道，未能自动描述。]`
      cache.set(key, structural)
      return structural
    }
    try {
      const stored = await readImage(attachment)
      const description = await translator.translate({ ref: stored.ref, data: stored.data })
      // Cache ONLY successful translations: a transient channel failure must
      // not poison every later request with a placeholder — retry next time.
      cache.set(key, description)
      return description
    } catch (error: unknown) {
      return `[用户上传图片（${attachment.mediaType}，附件 ${key}）未能自动描述：${error instanceof Error ? error.message : String(error)}。原图已保存在附件存储。]`
    }
  }

  // SERIAL across messages too: every image in the request history funnels
  // through one sidebar session, so translating one image at a time keeps
  // paste/reply pairs isolated. Cache hits skip the channel entirely.
  const out: unknown[] = []
  for (const message of messages) {
    const typed = message as { content?: readonly { type: string }[] }
    if (typed.content === undefined) {
      out.push(message)
      continue
    }
    out.push({ ...typed, content: await translateContentBlocks(typed.content, translateImage) })
  }
  return out
}

/** Message-list entry: image present anywhere in user content? */
export function listHasImage(messages: readonly unknown[]): boolean {
  return messages.some(message => {
    const content = (message as { content?: readonly { type: string }[] }).content
    return content !== undefined && contentHasImageBlock(content)
  })
}

function contentHasImageBlock(content: readonly { type: string }[]): boolean {
  return content.some(block => {
    if (block.type === 'image') return true
    if (block.type === 'tool-result') {
      const nested = (block as { content?: readonly { type: string }[] }).content
      return nested !== undefined && contentHasImageBlock(nested)
    }
    return false
  })
}

/** Channel option defaults read from the environment once at import. */
export interface QuarkQwenChannelOptions {
  /** Path to the qwen-vision-anchor.js helper script. */
  scriptPath?: string
  /** Node (or other) executable used to run the script. */
  command?: string
  /** Extra args before the script path (e.g. ["--no-warnings"]). */
  args?: string[]
  /** Hard timeout for one translation. */
  timeoutMs?: number
}

/** Prompt sent to the vision channel for one image. */
const DESCRIPTION_PROMPT =
  '请用中文简洁描述这张图片：1) 主体是谁/什么、在做什么；2) 服装/外观/关键细节；'
  + '3) 场景与氛围；4) 画面中的可见文字（如有请原样引用）。150字以内。'

/** Default search roots for the Quark vision helper script. */
const SCRIPT_CANDIDATES = [
  process.env.DSH_VISION_QWEN_SCRIPT,
  // Conventional DSH_HOME layout: quark-qwen-vision skill provides cdp.js +
  // the anchor helper. Resolved at import time from the environment.
  process.env.DSH_HOME === undefined
    ? undefined
    : `${process.env.DSH_HOME}\\skills\\quark-qwen-vision\\scripts\\qwen-vision-anchor.js`,
].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0)

function envChannel(): Partial<QuarkQwenChannelOptions> {
  const raw = Number(process.env.DSH_VISION_QWEN_TIMEOUT_MS ?? 0)
  return {
    ...process.env.DSH_VISION_QWEN_SCRIPT === undefined ? {} : { scriptPath: process.env.DSH_VISION_QWEN_SCRIPT },
    ...Number.isFinite(raw) && raw > 0 ? { timeoutMs: raw } : {},
    ...process.env.DSH_VISION_QWEN_COMMAND === undefined ? {} : { command: process.env.DSH_VISION_QWEN_COMMAND },
  }
}

/**
 * Default channel: runs the Quark Qwen sidebar helper (CDP) in a child
 * process. The helper pastes the image into the sidebar, asks for a
 * description, and prints only the new anchored reply on stdout.
 */
export class QuarkQwenChannel implements VisionTranslator {
  readonly label = 'quark-qwen-sidebar'
  private readonly scriptPath: string
  private readonly command: string
  private readonly args: string[]
  private readonly timeoutMs: number

  constructor(options: QuarkQwenChannelOptions = {}) {
    const env = envChannel()
    const found = options.scriptPath ?? env.scriptPath
      ?? SCRIPT_CANDIDATES[0]
    if (found === undefined || found.length === 0) {
      throw new Error('llm-deepseek vision: qwen-vision-anchor.js script path not configured')
    }
    this.scriptPath = found
    this.command = options.command ?? env.command ?? 'node'
    this.args = options.args ?? []
    // Reasonable hard timeout: one Quark image description measures ~6-12s
    // locally; 25s leaves headroom while still degrading well inside the
    // 30s browser unary budget instead of stalling the turn forever. A stuck
    // sidebar degrades to a placeholder (uncached, so it retries next turn).
    this.timeoutMs = options.timeoutMs ?? env.timeoutMs ?? 25_000
  }

  async translate(image: { ref: ImageRefLike; data: Uint8Array }): Promise<string> {
    const mediaType = image.ref.mediaType
    const ext = mediaType === 'image/png' ? 'png'
      : mediaType === 'image/jpeg' ? 'jpg'
        : mediaType === 'image/webp' ? 'webp' : mediaType === 'image/gif' ? 'gif' : 'bin'
    const dir = await mkdtemp(join(tmpdir(), 'dsh-vision-'))
    const file = join(dir, `image.${ext}`)
    try {
      await writeFile(file, image.data)
      const raw = await runHelper(this.command, [...this.args, this.scriptPath, file, DESCRIPTION_PROMPT], this.timeoutMs)
      return cleanDescription(raw, DESCRIPTION_PROMPT)
    } finally {
      void rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

/** Run the helper script and return its stdout, trimmed, or throw on failure. */
function runHelper(command: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`vision channel timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(`vision channel exited ${code}: ${stderr.trim().slice(0, 300) || stdout.trim().slice(0, 300)}`))
        return
      }
      const text = stdout.trim()
      if (text.startsWith('ERR:')) {
        reject(new Error(text))
        return
      }
      if (text.length === 0) {
        reject(new Error('vision channel returned empty reply'))
        return
      }
      resolve(text)
    })
  })
}

/** Clean the channel reply for the model context: drop the echoed question
 * prefix (the sidebar repeats the user's prompt before answering), collapse
 * whitespace, and drop trailing assistant suggestions.
 */
export function cleanDescription(raw: string, question?: string): string {
  let text = raw.trim()
  // 1. Drop an echoed question prefix when the channel repeated the prompt.
  const q = question?.trim()
  if (q !== undefined && q.length > 0 && text.startsWith(q)) {
    text = text.slice(q.length).trim()
  }
  // 2. Drop any leading line that echoes the question.
  const lines0 = text.split('\n')
  while (lines0.length > 0) {
    const head = lines0[0]!.trim()
    if (head.length === 0) { lines0.shift(); continue }
    if (q !== undefined && q.length > 0 && (head === q || head.startsWith(q.slice(0, 24)))) {
      lines0.shift()
      continue
    }
    if (/^请(用|以)?[\s\S]{0,12}(描述|介绍)这张图片/.test(head)) {
      lines0.shift()
      continue
    }
    break
  }
  text = lines0.join('\n').trim()
  // 3. Collapse blank runs.
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  // 4. Drop trailing sidebar suggestion lines.
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length >= 2) {
    const tail = lines[lines.length - 1]!
    if (/我帮你|帮你|要不要|需要我|想让我|可以帮你|方便你|想不想/.test(tail) && /[?？]$/.test(tail)) {
      lines.pop()
    }
  }
  return lines.join('\n').trim() || '(未生成描述)'
}
