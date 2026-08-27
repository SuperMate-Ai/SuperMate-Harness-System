// CDP 简易客户端 —— 通过 WebSocket 与夸克浏览器调试端口通信
// 用法: const cdp = require('./cdp');
// 跨机器通用：自动选择 WebSocket 实现（不依赖任何绝对路径）
//   1) ws 包（require 可解析时）
//   2) Node ≥ 22 内置 WebSocket（零依赖）
//   3) DSH_HOME 或脚本目录向上逐级 node_modules/ws 兜底
const http = require('http');
const path = require('path');
const fs = require('fs');

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

// ---------- WebSocket 解析 ----------
function resolveWebSocket() {
  // 1. ws 包
  try { return { kind: 'pkg', WS: require('ws') }; } catch (_) { /* 继续 */ }
  // 2. 内置（Node ≥ 22）
  if (typeof globalThis.WebSocket === 'function') return { kind: 'builtin' };
  // 3. 常见位置兜底
  const cands = [];
  let dir = __dirname;
  while (dir && path.dirname(dir) !== dir) {
    cands.push(path.join(dir, 'node_modules', 'ws'));
    dir = path.dirname(dir);
  }
  if (process.env.DSH_HOME) cands.push(path.join(process.env.DSH_HOME, 'node_modules', 'ws'));
  for (const c of cands) {
    try {
      if (fs.existsSync(path.join(c, 'package.json'))) return { kind: 'pkg', WS: require(c) };
    } catch (_) { /* 下一个 */ }
  }
  return null;
}

const WS_IMPL = resolveWebSocket();
if (!WS_IMPL) {
  console.error('未找到可用的 WebSocket：请安装 ws 包（cd 脚本目录 && npm i ws）或使用 Node ≥ 22');
  process.exit(1);
}

/** 统一创建 WebSocket（ws 包原生 API；内置 WebSocket 包装成 ws 包风格 on/send/close） */
function openSocket(wsUrl) {
  if (WS_IMPL.kind === 'pkg') return new WS_IMPL.WS(wsUrl);
  const s = new globalThis.WebSocket(wsUrl);
  const handlers = {};
  const shim = {
    send: (d) => s.send(d),
    close: () => s.close(),
    on: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); return shim; },
  };
  s.onopen = () => (handlers.open || []).forEach((f) => f());
  s.onmessage = (e) => {
    const emit = (d) => (handlers.message || []).forEach((f) => f(d));
    const d = e.data;
    if (typeof d === 'string') emit(d);
    else if (d instanceof ArrayBuffer) emit(Buffer.from(d).toString());
    else if (d && typeof d.text === 'function') d.text().then(emit).catch(() => {});
  };
  s.onerror = (e) => (handlers.error || []).forEach((f) => f((e && e.error) || new Error('WebSocket 连接错误')));
  s.onclose = () => (handlers.close || []).forEach((f) => f());
  return shim;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/** 列出所有页面/目标 */
async function listTargets() {
  return getJson(`${CDP_ENDPOINT}/json/list`);
}

/** 连接到指定 target 的 webSocketDebuggerUrl */
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = openSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.on('open', () => {
      resolve({
        ws,
        /** 发送 CDP 命令，返回 Promise<result> */
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const msgId = ++id;
            pending.set(msgId, { res, rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close() { ws.close(); },
      });
    });
    ws.on('error', reject);
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      }
    });
  });
}

/** 在页面 target 上执行 JS，返回 value（returnByValue） */
async function evaluate(conn, expression) {
  const r = await conn.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    throw new Error('JS 异常: ' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text));
  }
  return r.result ? r.result.value : undefined;
}

module.exports = { CDP_ENDPOINT, listTargets, connect, evaluate };
