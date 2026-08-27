// 夸克网盘下载：按文件名关键字定位文件 → 选中 → 触发下载
// 用法: node quark-drive-download.js <文件名关键字> [等待秒]
const cdp = require('./cdp');

(async () => {
  const keyword = process.argv[2];
  const waitSec = parseInt(process.argv[3] || '8', 10);
  if (!keyword) { console.error('用法: node quark-drive-download.js <文件名关键字>'); process.exit(1); }

  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('clouddrive') && p.url.includes('list'));
  if (!page) { console.error('未找到夸克网盘列表页（确认已登录夸克网盘）'); process.exit(1); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  // 1. 在文件列表行中定位包含关键字的文件
  const row = await cdp.evaluate(conn, `(() => {
    const rows = Array.from(document.querySelectorAll('[class*=cloud-column-file-item], [class*=file-item], [class*=column-file]'))
      .filter((el) => (el.offsetWidth || el.offsetHeight));
    const target = rows.find((el) => (el.innerText || el.textContent || '').includes(${JSON.stringify(keyword)}));
    if (!target) return { ok: false, rows: rows.length };
    target.click();
    return { ok: true };
  })()`);
  if (!row.ok) {
    console.error(`未找到含 "${keyword}" 的文件（当前列表 ${row.rows} 行）——请确认在当前文件夹或切到正确目录`);
    conn.close(); process.exit(1);
  }
  console.log(`[1/3] 已选中文件: ${keyword}`);
  await new Promise((r) => setTimeout(r, 1200));

  // 2. 点"下载"按钮（工具栏 quark-cloud-drive-button）
  const dl = await cdp.evaluate(conn, `(() => {
    const btns = Array.from(document.querySelectorAll('button, div, span'))
      .filter((el) => (el.innerText || '').trim() === '下载' && (el.className || '').toString().includes('quark-cloud-drive-button') && (el.offsetWidth || el.offsetHeight));
    if (btns.length) { btns[0].click(); return true; }
    return false;
  })()`);
  console.log('[2/3] 触发下载:', dl);
  if (!dl) { console.error('未找到下载按钮'); conn.close(); process.exit(1); }

  // 3. 等待下载
  console.log(`[3/3] 等待下载（${waitSec}s）...`);
  await new Promise((r) => setTimeout(r, waitSec * 1000));
  console.log('下载已触发——检查夸克传输列表确认状态，完成后文件在夸克下载目录');
  conn.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
