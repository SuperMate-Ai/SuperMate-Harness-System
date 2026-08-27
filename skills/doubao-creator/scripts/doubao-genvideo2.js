// 全自动豆包图生视频：上传图 → 提交 → 长轮询（10分钟）→ 检测卡片 → 点播放 → 抓 URL → 下载
// 用法: node doubao-genvideo2.js <图片路径> "需求" [输出目录]
const cdp = require('./cdp');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

(async () => {
  const imgPath = process.argv[2];
  const reqText = process.argv[3] || '请根据这张图片生成一个10秒的竖屏视频';
  const outDir = process.argv[4] || path.join(process.cwd(), 'generated', 'doubao', 'auto');
  if (!imgPath || !fs.existsSync(imgPath)) { console.error('图片不存在:', imgPath); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });

  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('doubao.com'));
  if (!page) { console.error('未找到豆包页面'); process.exit(1); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  // 记录当前已有视频卡片数（区分新旧）
  const beforeCards = await cdp.evaluate(conn, `(() => document.querySelectorAll('[class*="block-video"]').length)()`);
  console.log(`[0/6] 当前视频卡片数: ${beforeCards}`);

  // 1. 上传图片
  console.log('[1/6] 上传图片...');
  const doc = await conn.send('DOM.getDocument', { depth: -1 });
  const q = await conn.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type=file]' });
  if (!q.nodeId) { console.error('未找到 file input'); process.exit(1); }
  await conn.send('DOM.setFileInputFiles', { nodeId: q.nodeId, files: [imgPath] });
  await new Promise((r) => setTimeout(r, 4000));

  // 2. 输入需求
  console.log('[2/6] 输入需求...');
  await cdp.evaluate(conn, `(() => {
    const el = document.querySelector('[contenteditable="true"]');
    if (!el) return;
    el.focus();
    document.execCommand('insertText', false, ${JSON.stringify(reqText)});
  })()`);
  await new Promise((r) => setTimeout(r, 800));

  // 3. 发送
  console.log('[3/6] 发送...');
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

  // 3.5 等待「确认生成」气泡并点击（素材授权声明后的确认步骤，2026-08-25 实测必需）
  console.log('[3.5/6] 等待确认生成...');
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const c = await cdp.evaluate(conn, `(() => {
      const all = Array.from(document.querySelectorAll('body *')).filter((el) => (el.innerText || '').trim() === '确认生成' && (el.offsetWidth || el.offsetHeight));
      if (!all.length) return 'no-chip';
      const best = all.sort((a, b) => a.children.length - b.children.length)[0];
      best.click();
      return 'clicked:' + best.tagName;
    })()`);
    if (c.startsWith('clicked')) { console.log('      已点击确认生成:', c); break; }
    if (i === 14) console.log('      未出现确认生成气泡（本次可能无需确认）');
  }

  // 4. 长轮询等待视频卡片（最长 10 分钟）
  console.log('[4/6] 等待豆包生成视频（Seedance 预计 5 分钟，最长等 10 分钟）...');
  let videoUrl = null;
  let newCards = 0;
  for (let i = 0; i < 300; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await cdp.evaluate(conn, `(() => {
      const cards = Array.from(document.querySelectorAll('[class*="block-video"]'));
      const text = (document.body ? document.body.innerText : '');
      return { cardCount: cards.length, doneMark: /视频生成好了|视频已生成/.test(text), textTail: text.slice(-200) };
    })()`);
    newCards = st.cardCount - beforeCards;
    if (i % 30 === 0) console.log(`      [${Math.floor(i * 2 / 60)}:${(i * 2) % 60 < 10 ? '0' : ''}${(i * 2) % 60}] 卡片数=${st.cardCount} 完成标记=${st.doneMark}`);
    // 检测拒绝/失败文本（精确短语，避免把素材授权声明误判为拒绝——2026-08-25 实测踩坑）
    if (/出于肖像保护|暂不支持上传真实人脸|无法生成视频|不能生成视频|不支持生成视频/.test(st.textTail)) {
      console.log(`      ⚠️ 检测到拒绝/失败提示：${st.textTail.replace(/\n+/g, ' ').slice(-120)}`);
      console.log('      （等待用户处理或换图重试）');
      break;
    }
    if (newCards > 0) { console.log(`      ✅ 检测到新视频卡片（第 ${newCards} 张，${Math.floor(i * 2 / 60)}:${(i * 2) % 60}）`); break; }
    if (i === 299) break;
  }

  if (newCards <= 0) {
    console.log('\n❌ 10 分钟内未检测到视频卡片。页面尾部：');
    const tail = await cdp.evaluate(conn, `(() => (document.body ? document.body.innerText : '').slice(-600))()`);
    console.log(tail);
    conn.close(); process.exit(0);
  }

  // 5. 点击新卡片播放 → 抓 video URL
  console.log('[5/6] 点击视频卡片播放...');
  await cdp.evaluate(conn, `(() => {
    const cards = Array.from(document.querySelectorAll('[class*="block-video"]'));
    const last = cards[cards.length - 1];
    if (last) last.click();
  })()`);
  // 抓 URL：轮询 video 元素 30 秒
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    videoUrl = await cdp.evaluate(conn, `(() => {
      // 只取最后一个卡片内的 video（避免抓到旧视频元素——2026-08-25 实测踩坑）
      const cs = Array.from(document.querySelectorAll('[class*="block-video"]'));
      const last = cs[cs.length - 1];
      const v = last ? last.querySelector('video') : null;
      return (v && (v.currentSrc || v.src)) || '';
    })()`);
    if (videoUrl) break;
  }
  if (!videoUrl) {
    // 兜底：从新卡片 DOM 找 src/链接
    videoUrl = await cdp.evaluate(conn, `(() => {
      const cards = Array.from(document.querySelectorAll('[class*="block-video"]'));
      const last = cards[cards.length - 1];
      if (!last) return '';
      const v = last.querySelector('video');
      return (v && (v.currentSrc || v.src)) || '';
    })()`);
  }
  console.log('      视频 URL:', videoUrl ? videoUrl.slice(0, 120) + '...' : '未找到');

  if (!videoUrl) { console.log('❌ 未抓到视频 URL'); conn.close(); process.exit(0); }

  // 6. 下载
  console.log('[6/6] 下载视频...');
  const outFile = path.join(outDir, `doubao-auto-${Date.now()}.mp4`);
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
