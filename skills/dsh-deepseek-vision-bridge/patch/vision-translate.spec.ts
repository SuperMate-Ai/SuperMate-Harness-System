/**
 * Vision-translate seam unit tests: content-block replacement, ordering,
 * degradation without a channel, caching per attachment, and helper text
 * cleaning.
 */

import { describe, expect, it } from 'vitest'
import { translateMessages, translateContentBlocks, cleanDescription } from '../src/vision-translate.ts'
import type { ImageRefLike, VisionTranslator } from '../src/vision-translate.ts'

const redRef: ImageRefLike = {
  attachmentId: 'att-red',
  mediaType: 'image/png',
  bytes: 1,
  width: 1,
  height: 1,
  name: 'red.png',
}
const blueRef: ImageRefLike = {
  attachmentId: 'att-blue',
  mediaType: 'image/jpeg',
  bytes: 1,
  width: 1,
  height: 1,
}

const mockChannel: VisionTranslator = {
  label: 'mock',
  async translate(image) {
    if (image.ref.attachmentId === 'att-red') return '描述：一张红色图片。'
    return '描述：一张蓝色图片。'
  },
}

/** Minimal message shaped like the harness Message union subset we touch. */
function userMessage(id: string, content: unknown[]): unknown {
  return { id, role: 'user', content }
}

describe('translateContentBlocks', () => {
  it('replaces image blocks with text in original order and keeps text blocks', async () => {
    const translate = async (ref: ImageRefLike): Promise<string> => `看图(${ref.attachmentId})`
    const out = await translateContentBlocks(
      [
        { type: 'text', text: '开头' },
        { type: 'image', attachment: redRef },
        { type: 'text', text: '中段' },
        { type: 'image', attachment: blueRef },
      ],
      translate,
    )
    expect(out.map(b => b.type)).toEqual(['text', 'text', 'text', 'text'])
    const texts = out as { type: 'text'; text: string }[]
    expect(texts[0]!.text).toBe('开头')
    expect(texts[1]!.text).toBe('看图(att-red)')
    expect(texts[2]!.text).toBe('中段')
    expect(texts[3]!.text).toBe('看图(att-blue)')
  })

  it('degrades a failed image to a placeholder without rejecting the batch', async () => {
    const out = await translateContentBlocks(
      [{ type: 'image', attachment: redRef }],
      async () => { throw new Error('channel down') },
    )
    expect(out[0]).toMatchObject({ type: 'text' })
    const text = (out[0] as { type: 'text'; text: string }).text
    expect(text).toContain('未能自动描述')
    expect(text).toContain('att-red')
  })
})

describe('translateMessages', () => {
  it('translates only image-bearing messages and caches by attachment id', async () => {
    const cache = new Map<string, string>()
    const readImage = async (ref: ImageRefLike) => ({ ref, data: Uint8Array.of(1, 2, 3) })
    const calls: string[] = []
    const channel: VisionTranslator = {
      label: 'counting',
      async translate(image) {
        calls.push(image.ref.attachmentId)
        return `描述${image.ref.attachmentId}`
      },
    }
    const messages = [
      userMessage('m1', [{ type: 'image', attachment: redRef }]),
      userMessage('m2', [{ type: 'text', text: 'hi' }]),
    ]
    const first = await translateMessages(messages, readImage, channel, cache)
    // Same attachment again — must not call the channel a second time.
    await translateMessages(messages, readImage, channel, cache)
    expect(calls).toEqual(['att-red'])
    const content = (first[0] as { content: { type: string; text: string }[] }).content
    expect(content[0]!.text).toBe('描述att-red')
  })

  it('keeps the message admissible without a readImage seam', async () => {
    const cache = new Map<string, string>()
    const out = await translateMessages(
      [userMessage('m', [{ type: 'image', attachment: redRef }])],
      undefined,
      mockChannel,
      cache,
    )
    const content = (out[0] as { content: { type: string; text: string }[] }).content
    expect(content[0]!.text).toContain('att-red')
  })
})

describe('cleanDescription', () => {
  it('drops a trailing sidebar suggestion line', () => {
    const raw = '这是一张照片。\n画面中……。\n需要我帮你写文案吗？'
    expect(cleanDescription(raw)).toBe('这是一张照片。\n画面中……。')
  })
  it('drops the echoed question prefix', () => {
    const q = '请用中文简洁描述这张图片：主体是谁/什么、在做什么；'
    const raw = `${q} 这是一张照片，画面中是……。`
    expect(cleanDescription(raw, q)).toBe('这是一张照片，画面中是……。')
  })
  it('keeps a single-line reply intact', () => {
    expect(cleanDescription('一张蓝色天空的照片。')).toBe('一张蓝色天空的照片。')
  })
})
