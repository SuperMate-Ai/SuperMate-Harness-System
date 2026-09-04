// Durable per-attachment image->description cache for the vision bridge.
//
// The in-memory cache used to live only for the process lifetime, so every
// harness restart emptied it and the first request in a re-opened session
// re-questioned the Quark Qwen sidebar for every durable image block still in
// the history. Attachments are themselves durable (id stable across restarts),
// so persisting the cache beside them means a re-open serves old images as
// immediate hits and only brand-new images ever reach the channel.
//
// Designed not to over-engineer: a thin file-backed Map. Reads load once at
// construction; every successful translation writes through (debounced) so a
// restart keeps whatever was already described.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** Resolve the durable cache file path (env-authorizable, no magic home). */
export function visionCachePath(): string {
  if (process.env.DSH_VISION_CACHE !== undefined && process.env.DSH_VISION_CACHE.length > 0) {
    return process.env.DSH_VISION_CACHE
  }
  const home = process.env.DSH_HOME
  if (home !== undefined && home.length > 0) {
    return join(home, 'vision', 'vision-cache.json')
  }
  return join(tmpdir(), 'dsh-vision-cache.json')
}

/** Parse a stored cache file, tolerating absence/corruption. */
async function loadCache(file: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed !== null && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'string' && key.length > 0) map.set(key, value)
      }
    }
  } catch {
    // No file yet, or it was mid-write / corrupt: start empty.
  }
  return map
}

/** Throttled writer so a burst of translations coalesces into few writes. */
export class PersistentVisionCache extends Map<string, string> {
  private readonly file: string
  private dirty = false
  private timer: ReturnType<typeof setTimeout> | undefined
  /** Settles once the durable file has been seeded (or load failed). */
  private readonly readyPromise: Promise<void>

  constructor(file: string = visionCachePath()) {
    super()
    this.file = file
    this.readyPromise = loadCache(file).then(seeded => {
      for (const [key, value] of seeded) {
        // Do not overwrite a fresher in-session translation with a stale file.
        if (!super.has(key)) super.set(key, value)
      }
    })
  }

  /** Wait until any persisted descriptions have been loaded into this map. */
  ready(): Promise<void> {
    return this.readyPromise
  }

  override set(key: string, value: string): this {
    super.set(key, value)
    this.scheduleSave()
    return this
  }

  private scheduleSave(): void {
    this.dirty = true
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.save()
    }, 500)
  }

  private async save(): Promise<void> {
    if (!this.dirty) return
    this.dirty = false
    try {
      const payload = JSON.stringify(Object.fromEntries(this))
      await mkdir(dirname(this.file), { recursive: true })
      // Write-then-rename: a crash mid-write never leaves a truncated cache.
      const tmp = `${this.file}.${process.pid}.tmp`
      await writeFile(tmp, payload, 'utf8')
      await rename(tmp, this.file).catch(() => {})
    } catch {
      // Persistence is best-effort: a failed save must not break the bridge.
    }
  }

  /** Flush any pending write (call on shutdown if desired). */
  async flush(): Promise<void> {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    await this.save()
  }
}
