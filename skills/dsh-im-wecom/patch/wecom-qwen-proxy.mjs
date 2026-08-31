// WeCom image proxy: download inbound WeCom images and analyze them through
// the Quark browser's Qwen sidebar (qwen-vision.js), then return text-only
// content blocks. This lets a text-only Harness model answer image questions
// without image support — the system's vision strength is the Qwen sidebar.
//
// Controls:
//   DSH_WECOM_QWEN_VISION=0        disable the proxy (fall back to model images)
//   DSH_WECOM_QWEN_VISION_SCRIPT   path to qwen-vision.js (default: skill path)
//   DSH_WECOM_QWEN_TMP             temp dir for downloaded images
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_QUESTION = '请详细描述这张图片的内容，包括主体、场景、文字和细节。';
// Resolve the qwen-vision.js skill script portably: explicit env wins, then
// $DSH_HOME/skills, then ~/.dsh/skills.
function defaultVisionScript() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(home, 'skills', 'quark-qwen-vision', 'scripts', 'qwen-vision.js');
}
const VISION_SCRIPT = process.env.DSH_WECOM_QWEN_VISION_SCRIPT || defaultVisionScript();
const REPLY_MARKER = '[4/4] ===== 千问视觉回复 =====';

function detectMediaType(data) {
  if (data.length >= 8
    && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
    && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a) {
    return 'image/png';
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (data.length >= 12
    && data.subarray(0, 4).toString('ascii') === 'RIFF'
    && data.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

// The Qwen sidebar page is a shared singleton; serialize every analysis.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function runQwenVision(imagePath, question, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [VISION_SCRIPT, imagePath, question], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      finish(reject, new Error('qwen vision timed out'));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finish(reject, error));
    child.on('close', (code) => {
      if (code !== 0) {
        return finish(reject, new Error(
          `qwen vision exited ${code}: ${String(stderr || stdout).slice(0, 300)}`,
        ));
      }
      const index = stdout.indexOf(REPLY_MARKER);
      const body = (index >= 0 ? stdout.slice(index + REPLY_MARKER.length) : stdout).trim();
      if (!body || body === '(空)') {
        return finish(reject, new Error('qwen vision returned an empty reply'));
      }
      finish(resolve, body);
    });
  });
}

function extensionFor(data) {
  switch (detectMediaType(data)) {
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/jpeg': return 'jpg';
    default: return 'jpg';
  }
}

/**
 * Build text-only content blocks for an inbound message that carries images:
 * the user's own text (if any) plus one "[千问侧栏视觉分析 N]" text block per
 * image containing the Qwen sidebar's analysis.
 */
export async function qwenVisionContentForMessage(message, { signal, logger } = {}) {
  const sources = Array.isArray(message?.images) ? message.images.filter(Boolean) : [];
  if (sources.length === 0) return [];
  const text = typeof message?.content === 'string' && message.content.trim()
    ? message.content.trim()
    : '';
  const dir = join(
    process.env.DSH_WECOM_QWEN_TMP || join(tmpdir(), 'dsh-wecom-qwen'),
    randomUUID(),
  );
  await mkdir(dir, { recursive: true });
  const blocks = [];
  try {
    for (const [index, source] of sources.entries()) {
      signal?.throwIfAborted();
      const result = await source.load({ signal });
      const data = Buffer.from(result?.data ?? result?.buffer ?? result);
      if (!data.length) throw new Error(`image ${index + 1} is empty`);
      const path = join(dir, `img-${index + 1}.${extensionFor(data)}`);
      await writeFile(path, data);
      const question = text || DEFAULT_QUESTION;
      logger?.info?.(
        `[dsh-im:wecom] qwen sidebar analyzing image ${index + 1}/${sources.length}`,
      );
      const answer = await enqueue(() => runQwenVision(path, question));
      blocks.push({ type: 'text', text: `[千问侧栏视觉分析 ${index + 1}]\n${answer}` });
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
  if (text) blocks.unshift({ type: 'text', text });
  return blocks.length > 0 ? blocks : [{ type: 'text', text: text || '请分析这张图片。' }];
}
