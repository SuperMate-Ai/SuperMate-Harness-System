// 视觉文件整理 · webp→png 批量无损转换（webp2png.js）
// 用法:
//   node webp2png.js "<webp文件>" ["输出.png"]     # 单文件
//   node webp2png.js "<图片目录>"                  # 批量：目录内所有 webp → 同名 png
// 原理：CDP 控制夸克 → 新建空白页 → 加载 data:image/webp → canvas 绘制 → toDataURL('image/png')
//     用浏览器内核自带的 WebP 解码（零依赖），逐像素无损重编码为 PNG。
const cdp = require('./cdp');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function convertOne(conn, src, dst) {
  const b64 = fs.readFileSync(src).toString('base64');
  const target = await conn.send('Target.createTarget', { url: 'about:blank' });
  const targetId = target.targetId;
  const list = await cdp.listTargets();
  const tp = list.find(t => t.id === targetId);
  if (!tp) { console.error('❌ 新页面创建失败'); return false; }
  const c2 = await cdp.connect(tp.webSocketDebuggerUrl);
  await sleep(800);

  const r = await c2.send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const img = new Image();
        img.src = 'data:image/webp;base64,${b64}';
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('img load fail')); });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return { ok: true, w: img.naturalWidth, h: img.naturalHeight, png: c.toDataURL('image/png') };
      } catch (e) { return { ok: false, err: String(e) }; }
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  c2.close();
  await conn.send('Target.closeTarget', { targetId });

  if (r.exceptionDetails) { console.error('❌ JS 异常:', JSON.stringify(r.exceptionDetails)); return false; }
  const v = r.result.value;
  if (!v.ok) { console.error('❌ 转换失败:', v.err); return false; }
  fs.writeFileSync(dst, Buffer.from(v.png.split(',')[1], 'base64'));
  console.log(`✅ ${path.basename(src)} → ${path.basename(dst)} (${v.w}x${v.h})`);
  return true;
}

(async () => {
  const arg = process.argv[2];
  const out = process.argv[3];
  if (!arg) { console.error('用法: node webp2png.js "<webp文件|目录>" ["输出文件"]'); process.exit(1); }

  const pages = await cdp.listTargets();
  const anyPage = pages.find(p => p.type === 'page');
  if (!anyPage) { console.error('未找到浏览器页面（夸克是否以 9222 调试模式运行？）'); process.exit(1); }
  const conn = await cdp.connect(anyPage.webSocketDebuggerUrl);

  if (fs.statSync(arg).isFile()) {
    const src = arg;
    const dst = out || path.join(path.dirname(src), path.basename(src, path.extname(src)) + '.png');
    await convertOne(conn, src, dst);
  } else {
    const files = fs.readdirSync(arg).filter(f => /\.webp$/i.test(f)).sort();
    console.log(`批量转换 ${files.length} 个 webp → png`);
    for (const f of files) {
      const src = path.join(arg, f);
      const dst = path.join(arg, path.basename(f, '.webp') + '.png');
      if (fs.existsSync(dst)) { console.log(`⏭️ 跳过（已存在 png）: ${f}`); continue; }
      try { await convertOne(conn, src, dst); } catch (e) { console.error(`❌ ${f}: ${e.message}`); }
      await sleep(400);
    }
  }
  conn.close();
  process.exit(0);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });