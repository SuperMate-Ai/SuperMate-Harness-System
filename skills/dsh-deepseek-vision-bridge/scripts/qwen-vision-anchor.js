// ============================================================
//  qwen-vision-anchor.js — 贴图识图专用（服务端转译后端用）
//  用法: node qwen-vision-anchor.js <图片路径> [问题]
//  输出: 本次提问之后的新回复（唯一标记定位，干净无历史）
//  特性: 多页面选文本最全；唯一标记 §Q<ts>§ 定位；去尾部建议句
//  前置: 夸克 9222 调试模式 + 千问侧栏页已打开
// ============================================================
const cdp = require('./cdp');
const fs = require('fs');

(async () => {
  const imgPath = process.argv[2];
  if (!imgPath || !fs.existsSync(imgPath)) {
    console.error('ERR:no-image-path');
    process.exit(1);
  }
  const question = process.argv[3]
    || '请详细描述这张图片的内容：主体、细节、风格、氛围、画面中的可见文字。';
  const MARK = `\u00A7Q${Date.now()}\u00A7`; // §Q<ts>§ 唯一标记

  const pages = (await cdp.listTargets()).filter((p) => p.url.includes('pcquark-chat'));
  if (pages.length === 0) {
    console.error('ERR:no-quark-chat-page: 请确认夸克9222调试模式且千问侧栏页已打开');
    process.exit(1);
  }

  // 选文本最全的千问页作为活跃对话页
  let bestPage = pages[0];
  let bestLen = -1;
  const texts = [];
  for (const p of pages) {
    try {
      const c = await cdp.connect(p.webSocketDebuggerUrl);
      const t = await cdp.evaluate(c, `(() => (document.body ? document.body.innerText : '').trim())()`);
      c.close();
      texts.push({ p, t });
      if (t.length > bestLen) { bestLen = t.length; bestPage = p; }
    } catch (_) { /* skip */ }
  }
  if (bestLen <= 0) { console.error('ERR:page-text-empty'); process.exit(1); }

  const conn = await cdp.connect(bestPage.webSocketDebuggerUrl);
  const startLen = (texts.find(x => x.p === bestPage) || { t: '' }).t.length;

  // 1. 贴图（paste 事件）
  const b64 = fs.readFileSync(imgPath).toString('base64');
  const ext = imgPath.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png'
    : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/png';
  const fileName = imgPath.split(/[\\/]/).pop();

  const pasted = await cdp.evaluate(conn, `(async () => {
    const b64 = ${JSON.stringify(b64)};
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mime)} });
    const dt = new DataTransfer();
    dt.items.add(file);
    const ta = document.querySelector('textarea');
    if (!ta) return { ok: false };
    ta.focus();
    ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    return { ok: true };
  })()`);
  if (!pasted.ok) { console.error('ERR:paste-failed'); conn.close(); process.exit(1); }

  // 2. 等待上传，写入带唯一标记的问题
  await new Promise((r) => setTimeout(r, 4000));
  const fullQuestion = MARK + question;
  const wrote = await cdp.evaluate(conn, `(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(fullQuestion)});
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
    return true;
  })()`);
  if (!wrote) { console.error('ERR:no-textarea'); conn.close(); process.exit(1); }
  await new Promise((r) => setTimeout(r, 800));

  // 3. 发送
  const sent = await cdp.evaluate(conn, `(() => {
    const btn = document.querySelector('.submit-button.active')
      || document.querySelector('.submit-button')
      || [...document.querySelectorAll('button')].find(b => (b.innerText||'').includes('发送') && b.offsetWidth);
    if (btn && (btn.offsetWidth || btn.offsetHeight)) { btn.click(); return true; }
    return false;
  })()`);
  if (!sent) { console.error('ERR:send-failed'); conn.close(); process.exit(1); }

  // 4. 轮询页面文本增长且稳定
  let last = '';
  let stable = 0;
  let grown = 0;
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const cur = await cdp.evaluate(conn, `(() => (document.body ? document.body.innerText : '').trim())()`);
    if (cur.length > startLen + 40) grown++;
    if (cur !== last) { last = cur; stable = 0; }
    else stable++;
    if (grown >= 1 && stable >= 5) break;
    if (i === 60) { console.error('ERR:timeout'); conn.close(); process.exit(1); }
  }
  conn.close();

  // 5. 唯一标记定位：取标记之后的内容
  const pos = last.lastIndexOf(MARK);
  let reply;
  if (pos >= 0) {
    reply = last.slice(pos + MARK.length);
  } else {
    reply = last;
  }
  reply = reply.replace(/^[\s\n]*/, '').replace(/\s+$/, '');
  // 6. 清理：去掉问题的回声行（AI 常把提问回显），再去尾部建议句
  let lines = reply.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length > 0 && lines[0] === question.trim()) lines.shift();
  // 再次：回声可能被拆成多行，若开头若干行拼接等于问题则剥掉
  let joined = '';
  let cut = 0;
  for (const line of lines) {
    if (joined.length >= question.length) break;
    joined += line;
    cut++;
    if (joined === question.replace(/\s+/g, '')) break;
  }
  if (joined === question.replace(/\s+/g, '')) lines = lines.slice(cut);
  // 尾部建议句（“这身穿搭很有风格，需要我帮你…吗？” 等）
  if (lines.length >= 2) {
    const tail = lines[lines.length - 1];
    if (/我帮你|帮你|要不要|需要我|想让我|可以帮你|方便你/.test(tail) && /[?？]$/.test(tail)) {
      lines.pop();
    }
  }
  console.log(lines.join('\n').slice(0, 6000) || '(empty)');
  process.exit(0);
})().catch((e) => { console.error('ERR:' + (e && e.message ? e.message : String(e))); process.exit(1); });
