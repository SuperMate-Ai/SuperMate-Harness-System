// ============================================================
//  qwen-vision.js — 用夸克浏览器内置千问（qwen-vl）看图
//  原理：CDP 控制夸克 → 模拟粘贴图片到千问对话页 → 提问 → 读回复
//  用法: node qwen-vision.js <图片路径> ["问题"]
//  前置：夸克浏览器需以 --remote-debugging-port=9222 启动
// ============================================================
const cdp = require('./cdp');
const fs = require('fs');

(async () => {
  const imgPath = process.argv[2];
  const question = process.argv[3] || '请详细描述这张图片的内容';
  if (!imgPath || !fs.existsSync(imgPath)) {
    console.error('用法: node qwen-vision.js <图片路径> ["问题"]');
    console.error('图片不存在:', imgPath);
    process.exit(1);
  }

  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('pcquark-chat'));
  if (!page) {
    console.error('未找到千问对话页。请确认：');
    console.error('  1. 夸克以调试模式启动（--remote-debugging-port=9222）');
    console.error('  2. 千问对话侧边栏已打开（p.quark.cn/pcquark-chat/sidebar）');
    process.exit(1);
  }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  // 1. 图片 → base64 → File → paste 事件
  const b64 = fs.readFileSync(imgPath).toString('base64');
  const ext = imgPath.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  const fileName = imgPath.split(/[\\/]/).pop();

  const paste = await cdp.evaluate(conn, `(async () => {
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
  if (!paste.ok) { console.error('粘贴失败：未找到输入框'); conn.close(); process.exit(1); }
  console.log('[1/4] 图片已粘贴，等待上传...');
  await new Promise((r) => setTimeout(r, 3000));

  // 2. 输入问题并发送
  await cdp.evaluate(conn, `(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(question)});
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  })()`);
  await new Promise((r) => setTimeout(r, 800));
  const sent = await cdp.evaluate(conn, `(() => {
    const btn = document.querySelector('.submit-button.active, .submit-button');
    if (btn && (btn.offsetWidth || btn.offsetHeight)) { btn.click(); return true; }
    return false;
  })()`);
  if (!sent) { console.error('未找到发送按钮'); conn.close(); process.exit(1); }
  console.log('[2/4] 已发送问题，等待千问回复...');

  // 3. 轮询回复（取最后一条 AI 消息）
  let last = '';
  let stable = 0;
  for (let i = 0; i < 75; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const cur = await cdp.evaluate(conn, `(() => (document.body ? document.body.innerText : '').trim())()`);
    if (cur !== last) { last = cur; stable = 0; }
    else stable++;
    if (stable >= 4) break;
  }
  console.log('[3/4] 回复完成');
  console.log('\n[4/4] ===== 千问视觉回复 =====');
  console.log(last.slice(0, 8000) || '(空)');
  conn.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
