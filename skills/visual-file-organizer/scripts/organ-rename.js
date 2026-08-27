// 视觉文件整理（organ-rename.js）—— 批量把图片交给千问分析，按「内容(≤6字)+风格+扩展名」生成新文件名
// 用法:
//   node organ-rename.js "<图片目录>"            # 只分析，打印建议名（不重命名）
//   node organ-rename.js "<图片目录>" --apply     # 分析并应用重命名
//   node organ-rename.js "<图片目录>" -n 3        # 只处理前 3 张
// 原理：夸克千问对话页累积会话 → 每张图粘贴+提问后，以问题文本为锚点截取本次回复，解析"内容|风格"。
const cdp = require('./cdp');
const fs = require('fs');
const path = require('path');

const QUESTION = '只回答一行，严格格式：内容|风格。内容=不超过6个中文字总结图片核心内容；风格=不超过4个中文字。示例：海边少女|唯美。不要输出任何其他文字。';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseArgs(argv) {
  const dir = argv[2];
  const apply = argv.includes('--apply');
  const nIdx = argv.indexOf('-n');
  const limit = nIdx >= 0 && argv[nIdx + 1] ? parseInt(argv[nIdx + 1], 10) : Infinity;
  if (!dir) { console.error('用法: node organ-rename.js "<图片目录>" [--apply] [-n 数量]'); process.exit(1); }
  return { dir, apply, limit };
}

async function analyzeOne(conn, imgPath) {
  const b64 = fs.readFileSync(imgPath).toString('base64');
  const ext = imgPath.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  const fileName = path.basename(imgPath);

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
  if (!paste.ok) return { file: fileName, error: '粘贴失败' };
  await sleep(3000);

  await cdp.evaluate(conn, `(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(QUESTION)});
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  })()`);
  await sleep(800);
  const sent = await cdp.evaluate(conn, `(() => {
    const btn = document.querySelector('.submit-button.active, .submit-button');
    if (btn && (btn.offsetWidth || btn.offsetHeight)) { btn.click(); return true; }
    return false;
  })()`);
  if (!sent) return { file: fileName, error: '发送失败' };

  let last = '';
  let stable = 0;
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const cur = await cdp.evaluate(conn, `(() => (document.body ? document.body.innerText : '').trim())()`);
    if (cur !== last) { last = cur; stable = 0; } else stable++;
    if (stable >= 4) break;
  }

  const qIdx = last.lastIndexOf(QUESTION);
  let reply = qIdx >= 0 ? last.slice(qIdx + QUESTION.length) : last;
  reply = reply.trim().split('\n')[0].trim();
  const m = reply.match(/^([^\|]{1,8})\|([^\|]{1,8})/);
  const r = { file: fileName, raw: reply };
  if (m) { r.content = m[1].trim(); r.style = m[2].trim(); }
  else r.error = '格式未匹配';
  return r;
}

(async () => {
  const { dir, apply, limit } = parseArgs(process.argv);
  if (!fs.existsSync(dir)) { console.error('目录不存在:', dir); process.exit(1); }
  const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).sort().slice(0, limit);
  console.log(`待分析: ${files.length} 张 (${apply ? '将应用重命名' : '仅预览'})`);
  if (!files.length) process.exit(1);

  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('pcquark-chat'));
  if (!page) { console.error('未找到千问对话页，请先打开夸克千问侧边栏'); process.exit(1); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  const results = [];
  for (const f of files) {
    console.log(`\n=== ${f} ===`);
    const r = await analyzeOne(conn, path.join(dir, f));
    console.log(JSON.stringify(r));
    results.push(r);
    await sleep(1000);
  }
  conn.close();

  console.log('\n===== 命名结果 =====');
  const plan = [];
  for (const r of results) {
    if (r.content && r.style) {
      const ext = path.extname(r.file);
      const newName = r.content + r.style + ext;
      plan.push({ old: r.file, neu: newName });
      console.log(`${r.file}  →  ${newName}`);
    } else {
      console.log(`${r.file}  →  ❌ ${r.error || r.raw}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'organ-rename-results.json'), JSON.stringify(plan, null, 2));

  if (apply) {
    console.log('\n===== 应用重命名 =====');
    let okCount = 0;
    for (const p of plan) {
      const src = path.join(dir, p.old);
      const dst = path.join(dir, p.neu);
      if (fs.existsSync(dst)) { console.log(`⚠️ 跳过（目标已存在）: ${p.neu}`); continue; }
      try {
        fs.renameSync(src, dst);
        console.log(`✅ ${p.old} → ${p.neu}`);
        okCount++;
      } catch (e) { console.log(`❌ ${p.old}: ${e.message}`); }
    }
    console.log(`\n完成 ${okCount}/${plan.length} 个文件重命名`);
  } else {
    console.log('\n(预览模式，未改动文件。加 --apply 执行重命名)');
  }
  process.exit(0);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });