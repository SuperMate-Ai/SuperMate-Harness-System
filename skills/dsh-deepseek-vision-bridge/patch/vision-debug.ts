// Debug helper: append to a file so web-process errors are observable even
// though its stderr goes to a console window we cannot read.
import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'

const LOG = join(process.env.DSH_HOME ?? 'E:\\Harness Workspace\\.dsh', 'vision-bridge-debug.log')

export function visionLog(message: string): void {
  void appendFile(LOG, `${new Date().toISOString()} ${message}\n`).catch(() => {})
}
