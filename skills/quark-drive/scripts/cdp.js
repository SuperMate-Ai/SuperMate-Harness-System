// CDP 简易客户端 —— 通过 WebSocket 与夸克浏览器调试端口通信
// 用法: const cdp = require('./cdp');
const WebSocket = require('D:\\AI\\Dsh_Data\\profiles\\node_modules\\ws');
const http = require('http');

const CDP_ENDPOINT = 'http://127.0.0.1:9222';

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
    const ws = new WebSocket(wsUrl);
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
