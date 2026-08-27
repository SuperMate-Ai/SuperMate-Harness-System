// 让豆包看图：上传图片 + 提问 + 轮询回复
// 用法: node doubao-vision.js <图片路径> ["问题"]
const cdp = require('./cdp');

(async () => {
  const imgPath = process.argv[2];
  const question = process.argv[3] || '请详细描述这张图片的内容';
  if (!imgPath) { console.error('用法: node doubao-vision.js <图片路径> ["问题"]'); process.exit(1); }

  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('doubao.com'));
  if (!page) { console.error('未找到豆包页面'); process.exit(1); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  // 1. 用 DOM.setFileInputFiles 上传图片（原生 file input）
  console.log('[1/4] 上传图片到豆包...');
  const doc = await conn.send('DOM.getDocument', { depth: -1 });
  const q = await conn.send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type=file]',
  });
  if (!q.nodeId) { console.error('未找到 file input'); process.exit(1); }
  await conn.send('DOM.setFileInputFiles', { nodeId: q.nodeId, files: [imgPath] });
  console.log('      文件已设置，等待上传处理...');
  await new Promise((r) => setTimeout(r, 4000));

  // 检查上传栏状态（图片是否挂上）
  const upState = await cdp.evaluate(conn, `(() => {
    // 找图片缩略图（输入框附近）
    const imgs = Array.from(document.querySelectorAll('img')).filter((im) => im.naturalWidth > 50 && im.src.startsWith('blob:'));
    const ta = document.querySelector('[contenteditable="true"]');
    return { thumbCount: imgs.length, hasEditor: !!ta };
  })()`);
  console.log('      上传状态:', JSON.stringify(upState));

  // 2. 输入问题（contenteditable）
  console.log('[2/4] 输入问题...');
  const inp = await cdp.evaluate(conn, `(() => {
    const el = document.querySelector('[contenteditable="true"]') || document.querySelector('div[contenteditable]');
    if (!el) return { ok: false };
    el.focus();
    document.execCommand('insertText', false, ${JSON.stringify(question)});
    return { ok: true, text: el.innerText.slice(0, 60) };
  })()`);
  console.log('      输入:', JSON.stringify(inp));
  await new Promise((r) => setTimeout(r, 800));

  // 3. 找发送按钮（输入后出现）或 Enter
  console.log('[3/4] 发送...');
  const sent = await cdp.evaluate(conn, `(() => {
    // 找 aria 含 发送/回车 的按钮，或图标按钮
    const btns = Array.from(document.querySelectorAll('button, [role=button]'));
    const send = btns.find((b) => {
      const aria = (b.getAttribute('aria-label') || '');
      const cls = (b.className || '').toString();
      return (aria.includes('发送') || aria.includes('send') || /send|submit/i.test(cls)) && (b.offsetWidth || b.offsetHeight);
    });
    if (send) { send.click(); return 'clicked: ' + (send.getAttribute('aria-label') || send.className).toString().slice(0, 40); }
    // 否则按 Enter
    const el = document.querySelector('[contenteditable="true"]');
    if (el) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      return 'Enter';
    }
    return 'not-found';
  })()`);
  console.log('      发送方式:', sent);

  // 4. 轮询回复
  console.log('[4/4] 等待豆包回复...');
  let last = '';
  let stable = 0;
  for (let i = 0; i < 75; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const cur = await cdp.evaluate(conn, `(() => (document.body ? document.body.innerText : '').trim())()`);
    if (cur !== last) { last = cur; stable = 0; }
    else stable++;
    if (stable >= 4) break;
  }
  // 输出回复（问题之后的内容；截到输入区快捷栏标记，避免把 UI 尾部带进来）
  const idx = last.lastIndexOf(question);
  let reply = idx >= 0 ? last.slice(idx + question.length) : last;
  const uiMark = reply.indexOf('豆包 快速');
  if (uiMark >= 0) reply = reply.slice(0, uiMark);
  reply = reply.replace(/\n{3,}/g, '\n\n').trim();
  console.log('\n===== 豆包回复 =====');
  console.log(reply.slice(0, 6000) || '(未捕获到)');
  conn.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
