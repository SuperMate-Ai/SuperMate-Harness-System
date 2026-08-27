// 让千问对话直接生成图片：发送提示词 → 轮询页面抓取新图片 → 下载保存
// 用法: node gen-image.js "提示词" [输出目录]
const cdp = require('./cdp');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

(async () => {
  const prompt = process.argv[2];
  const outDir = process.argv[3] || path.join(process.cwd(), 'generated');
  if (!prompt) { console.error('用法: node gen-image.js "提示词" [输出目录]'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });

  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('pcquark-chat'));
  if (!page) { console.error('未找到对话页'); process.exit(1); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  // 记录发送前的图片（排除小图标）
  const before = await cdp.evaluate(conn, `(() => Array.from(document.querySelectorAll('img')).map((i) => i.src).filter((s) => s.length > 20))()`);

  // 1. 输入提示词
  const msg = '请根据以下提示词生成一张图片（文生图）：' + prompt;
  await cdp.evaluate(conn, `(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(msg)});
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  })()`);
  await new Promise((r) => setTimeout(r, 800));
  const sent = await cdp.evaluate(conn, `(() => {
    const btn = document.querySelector('.submit-button.active, .submit-button');
    if (btn && (btn.offsetWidth || btn.offsetHeight)) { btn.click(); return true; }
    return false;
  })()`);
  console.log('已发送生图请求:', sent);
  console.log('轮询等待生成图片（最长 3 分钟）...');

  // 2. 轮询找新图片
  let found = [];
  let lastText = '';
  let stable = 0;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await cdp.evaluate(conn, `(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
        .map((im) => ({ src: im.src, w: im.naturalWidth || im.width, h: im.naturalHeight || im.height }))
        .filter((x) => x.src.length > 20 && !x.src.startsWith('data:image/svg') && x.src !== 'data:');
      return { imgs, text: (document.body ? document.body.innerText : '').slice(-3000) };
    })()`);
    // 新出现的大图
    for (const im of st.imgs) {
      if (!before.includes(im.src) && !found.includes(im.src) && (im.w >= 200 || im.h >= 200)) {
        found.push(im.src);
        console.log(`发现图片: ${im.src.slice(0, 150)} (${im.w}x${im.h})`);
      }
    }
    if (st.text !== lastText) { lastText = st.text; stable = 0; } else stable++;
    if (found.length > 0 && stable >= 4) break;
    if (i === 89) break;
  }

  // 3. 下载图片
  if (!found.length) {
    console.log('未发现生成的图片。回复文本尾部：');
    console.log(lastText.slice(-1500));
    conn.close(); process.exit(0);
  }
  for (let i = 0; i < found.length; i++) {
    const src = found[i];
    const ext = src.includes('.png') || src.startsWith('data:image/png') ? 'png' : src.startsWith('data:image/webp') ? 'webp' : 'jpg';
    const outFile = path.join(outDir, `qwen-gen-${Date.now()}-${i + 1}.${ext}`);
    if (src.startsWith('data:')) {
      const m = src.match(/^data:image\/(\w+);base64,(.*)$/);
      if (m) { fs.writeFileSync(outFile, Buffer.from(m[2], 'base64')); console.log('已保存:', outFile); }
    } else if (src.startsWith('blob:')) {
      const b64 = await cdp.evaluate(conn, `(async () => {
        try {
          const r = await fetch(${JSON.stringify(src)});
          const b = await r.blob();
          return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
        } catch (e) { return 'ERR:' + e.message; }
      })()`);
      if (b64.startsWith('data:')) {
        const m = b64.match(/^data:image\/(\w+);base64,(.*)$/);
        if (m) { fs.writeFileSync(outFile, Buffer.from(m[2], 'base64')); console.log('已保存:', outFile); }
      } else console.log('blob 下载失败:', b64);
    } else {
      // https/http URL
      const mod = src.startsWith('https') ? https : http;
      await new Promise((resolve) => {
        mod.get(src, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
              const f = fs.createWriteStream(outFile); r2.pipe(f); f.on('finish', () => { console.log('已保存:', outFile); resolve(); });
            }).on('error', () => { console.log('下载失败:', src.slice(0, 80)); resolve(); });
          } else {
            const f = fs.createWriteStream(outFile); res.pipe(f); f.on('finish', () => { console.log('已保存:', outFile); resolve(); });
          }
        }).on('error', () => { console.log('下载失败:', src.slice(0, 80)); resolve(); });
      });
    }
  }
  console.log('\n回复文本尾部：');
  console.log(lastText.slice(-2000));
  conn.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
