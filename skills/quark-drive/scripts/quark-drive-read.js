// 读取夸克网盘页面内容（文件列表）
const cdp = require('./cdp');

(async () => {
  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('clouddrive') && p.url.includes('list'));
  if (!page) { console.error('未找到夸克网盘列表页'); process.exit(1); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);

  const r = await cdp.evaluate(conn, `(() => {
    const text = (document.body ? document.body.innerText : '');
    // 找文件列表元素（夸克网盘常见的文件项类名）
    const items = Array.from(document.querySelectorAll('[class*=file-item], [class*=fileItem], [class*=list-item], [class*=file_list], [class*=filelist]'))
      .map((el) => (el.innerText || '').trim().slice(0, 60))
      .filter(Boolean).slice(0, 20);
    return {
      title: document.title,
      url: location.href.slice(0, 120),
      textHead: text.slice(0, 1500),
      fileItems: items,
    };
  })()`);
  console.log('=== 标题 ===', r.title);
  console.log('=== URL ===', r.url);
  console.log('=== 页面文本（前 1500）===');
  console.log(r.textHead);
  console.log('=== 文件项 ===');
  r.fileItems.forEach((f, i) => console.log(`  ${i}: ${f}`));
  conn.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
