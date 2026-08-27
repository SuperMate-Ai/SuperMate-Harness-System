// 读取夸克传输列表（下载进度）
const cdp = require('./cdp');

(async () => {
  const pages = await cdp.listTargets();
  const page = pages.find((p) => p.url.includes('download-floating')) || pages.find((p) => p.url.includes('transfer'));
  if (!page) { console.log('未找到传输列表页'); process.exit(0); }
  const conn = await cdp.connect(page.webSocketDebuggerUrl);
  const r = await cdp.evaluate(conn, `(() => (document.body ? document.body.innerText : '').slice(0, 1000))()`);
  console.log(r || '(空)');
  conn.close();
  process.exit(0);
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
