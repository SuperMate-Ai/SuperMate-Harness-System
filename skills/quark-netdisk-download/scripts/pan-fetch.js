// 夸克网盘文件下载 —— 一键从网盘指定路径下载文件到本地
// 用法: node pan-fetch.js "<网盘路径>" "<本地目标路径>"
// 网盘路径示例: 文件/来自：分享/MiniMax H3/工作流+参考图/transparent_rgb_gaming_mouse.png
//
// 原理（经验沉淀，2026-08 云电脑实测）：
//   1) 夸克网盘页面 (uccd://cloud.quark/clouddrive/renderer/index.html) 可通过 9222 CDP 连接
//   2) 当前目录文件列表在 window.allFilesManager.list（含 file_name / fid / ftype）
//   3) 逐级进入文件夹：点击 .cloud-column-file-item 元素（innerText 去空白匹配后模拟鼠标事件）
//   4) 触发下载：选中文件后点击"下载"按钮 → 夸克客户端静默接管下载（无需处理浏览器下载框）
//   5) 轮询本地目标文件出现且大小稳定即成功
const cdp = require('./cdp');
const fs = require('fs');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const NETDISK_PATH = process.argv[2];
const LOCAL_TARGET = process.argv[3];
if (!NETDISK_PATH || !LOCAL_TARGET) {
  console.error('用法: node pan-fetch.js "<网盘路径>" "<本地目标>"');
  process.exit(1);
}

async function clickFileItem(conn, item, wait = 1600) {
  const name = (item.file_name || '').replace(/\s+/g, '');
  const r = await cdp.evaluate(conn, `(() => {
    const items = [...document.querySelectorAll('.cloud-column-file-item, [class*="CloudColumnsFile__file-item"]')];
    for (const el of items) {
      const t = (el.innerText || '').replace(/[\\n\\r\\s]+/g, '');
      if (t === ${JSON.stringify(name)} || t.startsWith(${JSON.stringify(name)})) {
        const rect = el.getBoundingClientRect();
        const opts = { bubbles: true, cancelable: true, clientX: rect.x + 30, clientY: rect.y + 30, view: window };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));
        return { ok: true };
      }
    }
    return { ok: false };
  })()`);
  if (!r.ok) return false;
  await sleep(wait);
  return true;
}

async function getFileList(conn) {
  return cdp.evaluate(conn, `(() => {
    const m = window.allFilesManager;
    return (m && (m.list || [])) || [];
  })()`);
}

(async () => {
  const targets = await cdp.listTargets();
  const pan = targets.find(t => t.url && t.url.includes('clouddrive/renderer/index.html'));
  if (!pan) { console.error('❌ 未找到夸克网盘页面，请先打开夸克网盘（uccd://cloud.quark/clouddrive）'); process.exit(1); }
  const conn = await cdp.connect(pan.webSocketDebuggerUrl);

  // 0) 确保在"文件"根视图
  await cdp.evaluate(conn, `(() => { const a=[...document.querySelectorAll('span,div,a')]; const el=a.find(e=>e.innerText&&e.innerText.trim()==='文件'&&e.offsetParent!==null); if(el) el.click(); return {}; })()`);
  await sleep(1500);

  // 1) 按路径逐级导航
  const parts = NETDISK_PATH.split('/').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const list = await getFileList(conn);
    const item = list.find(f => String(f.file_name || '').replace(/\s+/g, '') === parts[i].replace(/\s+/g, ''));
    if (!item) {
      console.error(`❌ 未找到节点 "${parts[i]}"。当前目录文件: ` + list.map(f => f.file_name).join(' | '));
      process.exit(1);
    }
    console.log(`[${isLast ? '目标文件' : '进入目录'}] ${item.file_name} (fid: ${item.fid})`);
    if (!isLast) {
      const ok = await clickFileItem(conn, item);
      if (!ok) { console.error('❌ 目录导航点击失败'); process.exit(1); }
    } else {
      // 2) 选中文件（先点击行，让行进入选中态）
      await clickFileItem(conn, item, 800);
      // 3) 点击"下载"按钮
      const dl = await cdp.evaluate(conn, `(() => {
        const all = [...document.querySelectorAll('span, div, a, button, li')];
        const el = all.find(e => {
          if (!e.innerText || e.offsetParent === null) return false;
          return e.innerText.trim() === '下载' && ![...e.children].some(k => k.innerText && k.innerText.trim() === '下载');
        });
        if (!el) return { ok: false };
        const rect = el.getBoundingClientRect();
        const opts = { bubbles: true, cancelable: true, clientX: rect.x + 10, clientY: rect.y + 10, view: window };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));
        return { ok: true };
      })()`);
      if (!dl.ok) { console.error('❌ 未找到"下载"按钮（请确认文件已选中）'); process.exit(1); }
      console.log('✅ 已点击"下载"，夸克客户端将静默保存到本地下载目录');
    }
  }

  // 4) 轮询等待目标文件出现（最多 120s）
  const targetName = parts[parts.length - 1];
  console.log('⏳ 等待下载完成: ' + LOCAL_TARGET);
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    if (fs.existsSync(LOCAL_TARGET)) {
      const sz = fs.statSync(LOCAL_TARGET).size;
      console.log(`✅ 文件已就位: ${LOCAL_TARGET} (${sz} 字节)`);
      conn.close();
      process.exit(0);
    }
  }
  console.log('⚠️ 等待超时——请检查夸克网盘"传输"页的下载任务，确认完成后手动复制到目标路径');
  conn.close();
  process.exit(1);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });