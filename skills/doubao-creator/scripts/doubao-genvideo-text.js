// 全自动豆包文生视频：输入需求 → 长轮询 → 检测卡片 → 点播放 → 抓 URL → 下载
// 用法: node doubao-genvideo-text.js "需求" [输出目录]
const cdp = require('./cdp');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

(async () => {
  const reqText = process.argv[2];
  const outDir = process.argv[3] || path.join(process.cwd(), 'generated', 'doubao', 'auto');
  if (!reqText) { console.error('用法: node doubao-genvideo-text.js "需求"'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });

  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('doubao.com'));
  if (!page) { console.error('未找到豆包页面'); process.exit(1); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  const beforeCards = await cdp.evaluate(conn, `(() => document.querySelectorAll('[class*="block-video"]').length)()`);
  console.log(`[0/5] 当前视频卡片数: ${beforeCards}`);

  // 1. 输入需求（文生视频，不传图）
  console.log('[1/5] 输入需求...');
  await cdp.evaluate(conn, `(() => {
    const el = document.querySelector('[contenteditable="true"]');
    if (!el) return;
    el.focus();
    document.execCommand('insertText', false, ${JSON.stringify(reqText)});
  })()`);
  await new Promise((r) => setTimeout(r, 800));

  // 2. 发送
  console.log('[2/5] 发送...');
  const sent = await cdp.evaluate(conn, `(() => {
    const btns = Array.from(document.querySelectorAll('button, [role=button]'));
    const send = btns.find((b) => {
      const aria = (b.getAttribute('aria-label') || '');
      const cls = (b.className || '').toString();
      return (aria.includes('发送') || /send|submit/i.test(cls)) && (b.offsetWidth || b.offsetHeight);
    });
    if (send) { send.click(); return true; }
    const el = document.querySelector('[contenteditable="true"]');
    if (el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })); return true; }
    return false;
  })()`);
  console.log('      发送:', sent);

  // 3. 长轮询等待新视频卡片（最长 10 分钟）
  console.log('[3/5] 等待豆包生成视频（最长 10 分钟）...');
  let newCards = 0;
  for (let i = 0; i < 300; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await cdp.evaluate(conn, `(() => {
      const cards = Array.from(document.querySelectorAll('[class*="block-video"]'));
      const text = (document.body ? document.body.innerText : '');
      return { cardCount: cards.length, textTail: text.slice(-300) };
    })()`);
    newCards = st.cardCount - beforeCards;
    if (i % 30 === 0) console.log(`      [${Math.floor(i * 2 / 60)}:${(i * 2) % 60 < 10 ? '0' : ''}${(i * 2) % 60}] 卡片数=${st.cardCount}`);
    // 精确拒绝检测（明确的拒绝短语 + 发送后至少 30 秒）
    if (i > 15 && /出于肖像保护|暂不支持上传真实人脸|涉及.*肖像|无法生成.*视频|不支持.*视频生成/.test(st.textTail)) {
      console.log(`      ⚠️ 检测到拒绝提示：${st.textTail.replace(/\n+/g, ' ').slice(-160)}`);
      break;
    }
    if (newCards > 0) { console.log(`      ✅ 检测到新视频卡片`); break; }
    if (i === 299) break;
  }

  if (newCards <= 0) {
    console.log('\n❌ 未检测到视频卡片。页面尾部：');
    const tail = await cdp.evaluate(conn, `(() => (document.body ? document.body.innerText : '').slice(-500))()`);
    console.log(tail);
    conn.close(); process.exit(0);
  }

  // 4. 点击新卡片播放 → 抓 URL
  console.log('[4/5] 点击视频卡片播放...');
  await cdp.evaluate(conn, `(() => {
    const cards = Array.from(document.querySelectorAll('[class*="block-video"]'));
    const last = cards[cards.length - 1];
    if (last) last.click();
  })()`);
  let videoUrl = '';
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    videoUrl = await cdp.evaluate(conn, `(() => {
      const v = document.querySelector('video');
      return (v && (v.currentSrc || v.src)) || '';
    })()`);
    if (videoUrl) break;
  }
  console.log('      视频 URL:', videoUrl ? videoUrl.slice(0, 120) + '...' : '未找到');
  if (!videoUrl) { console.log('❌ 未抓到 URL'); conn.close(); process.exit(0); }

  // 5. 下载
  console.log('[5/5] 下载视频...');
  const outFile = path.join(outDir, `doubao-text-${Date.now()}.mp4`);
  if (videoUrl.startsWith('blob:')) {
    const b64 = await cdp.evaluate(conn, `(async () => {
      try {
        const r = await fetch(${JSON.stringify(videoUrl)});
        const b = await r.blob();
        return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
      } catch (e) { return 'ERR:' + e.message; }
    })()`);
    if (b64.startsWith('data:')) {
      const m = b64.match(/^data:([^;]+);base64,(.*)$/);
      if (m) { fs.writeFileSync(outFile, Buffer.from(m[2], 'base64')); console.log('✅ 已保存:', outFile); }
    } else console.log('blob 失败:', b64.slice(0, 80));
  } else {
    await new Promise((resolve) => {
      const mod = videoUrl.startsWith('https') ? https : http;
      mod.get(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.doubao.com/' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.doubao.com/' } }, (r2) => {
            const f = fs.createWriteStream(outFile); r2.pipe(f); f.on('finish', () => { console.log('✅ 已保存:', outFile); resolve(); });
          }).on('error', () => { console.log('下载失败'); resolve(); });
        } else {
          const f = fs.createWriteStream(outFile); res.pipe(f); f.on('finish', () => { console.log('✅ 已保存:', outFile); resolve(); });
        }
      }).on('error', () => { console.log('下载失败'); resolve(); });
    });
  }
  conn.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
