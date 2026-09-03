// Debug helper: append to a file so web-process errors are observable even
// though its stderr goes to a console window we cannot read.
import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Optional diagnostics, off by default: set DSH_VISION_DEBUG_LOG to a file
// path to capture the bridge's per-request trace. No DSH_HOME hardcoding —
// this module stays deployment-agnostic.
const LOG = process.env.DSH_VISION_DEBUG_LOG
  ?? (process.env.DSH_VISION_DEBUG === '1' ? join(tmpdir(), 'dsh-vision-bridge-debug.log') : undefined)

export function visionLog(message: string): void {
  if (LOG === undefined) return
  void appendFile(LOG, `${new Date().toISOString()} ${message}\n`).catch(() => {})
}
