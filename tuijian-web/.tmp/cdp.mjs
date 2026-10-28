// 通过 Chrome DevTools Protocol 在真浏览器里量页面：真实移动端宽度、控制台报错、被裁切的元素。
import {spawn} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

class Session {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const {resolve, reject} = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.ws.send(JSON.stringify({id, method, params}));
    });
  }
  async evaluate(expr) {
    const r = await this.send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  }
  errors() {
    return this.events
      .filter((e) => (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
        || e.method === 'Runtime.exceptionThrown'
        || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'))
      .map((e) => e.method === 'Runtime.consoleAPICalled'
        ? e.params.args.map((a) => a.value ?? a.description).join(' ')
        : e.method === 'Runtime.exceptionThrown'
          ? (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
          : e.params.entry.text)
      .filter((t) => t && !/favicon/i.test(t));
  }
}

async function connect(port) {
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.addEventListener('open', res, {once: true}); ws.addEventListener('error', rej, {once: true}); });
        return new Session(ws);
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('DevTools 没有起来');
}

const MEASURE = `(() => {
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim()
    ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const res = { path: location.pathname, winW: window.innerWidth, docW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
    hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    clipped: [], overflowX: [],
    counts: {
      xhsCards: document.querySelectorAll('.xhs-card').length,
      articleFigures: document.querySelectorAll('.article-figure').length,
      paragraphs: document.querySelectorAll('.article-para').length,
      headings: document.querySelectorAll('.article-heading').length,
      posters: document.querySelectorAll('.generated-article.layout-poster').length,
      moments: document.querySelectorAll('.generated-article.layout-moment').length,
      momentPost: document.querySelectorAll('.moment-post').length,
      momentGrid: document.querySelectorAll('.moment-grid img').length,
      momentExpand: document.querySelectorAll('.moment-more').length,
    },
    marks: {
      flowHash: ((document.querySelector('.article-flow')?.innerText || '').match(/##/g) || []).length,
      bodyStars: (document.body.innerText.match(/\\*\\*/g) || []).length,
      momentShown: document.querySelector('.moment-text')?.textContent.length ?? null,
      headings: [...document.querySelectorAll('.article-heading')].slice(0, 2).map((e) => e.textContent.slice(0, 18)),
      momentNote: (document.querySelector('.moment-note')?.textContent || '').slice(0, 60) || null,
    } };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.overflowY === 'hidden' && el.scrollHeight - el.clientHeight > 2) res.clipped.push({el: name(el), over: el.scrollHeight - el.clientHeight});
    if (cs.overflowX === 'hidden' && el.scrollWidth - el.clientWidth > 2) res.overflowX.push({el: name(el), over: el.scrollWidth - el.clientWidth});
  }
  return JSON.stringify(res);
})()`;

export async function openBrowser(port = 9333) {
  const profile = `.tmp/edge-profile-${port}-${Date.now()}`;
  mkdirSync(profile, {recursive: true});
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
  const session = await connect(port);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  const close = () => { try { proc.kill(); } catch {} try { rmSync(profile, {recursive: true, force: true}); } catch {} };
  return {session, close};
}

export async function measure(session, url, {width, height, settle = 1500, ready, init = []} = {}) {
  session.events.length = 0;
  await session.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: width < 600});
  if (init.length) {
    const origin = new URL(url).origin;
    await session.send('Page.navigate', {url: origin + '/'});
    const t1 = Date.now();
    // 刚启动时当前文档还是 about:blank，它的 readyState 也是 complete，
    // 必须先确认已经停到目标 origin 上，否则写 localStorage 会抛 SecurityError。
    while (Date.now() - t1 < 20000) {
      const state = await session.evaluate(`location.href.startsWith(${JSON.stringify(origin)}) ? document.readyState : 'pending'`);
      if (state === 'complete') break;
      await new Promise((r) => setTimeout(r, 100));
    }
    for (const js of init) await session.evaluate(js);
  }
  await session.send('Page.navigate', {url});
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const state = await session.evaluate(`document.readyState + '|' + ${ready ? `!!document.querySelector(${JSON.stringify(ready)})` : 'true'}`);
    if (state === 'complete|true') break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, settle));
  const result = JSON.parse(await session.evaluate(MEASURE));
  result.errors = session.errors();
  return result;
}

// 只有直接运行本文件时才走命令行模式（被 import 时 process.argv 是调用方的参数）。
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/.tmp/cdp.mjs');
if (isMain && process.argv[2]) {
  const [url, width = '1400', ready = ''] = process.argv.slice(2);
  const {session, close} = await openBrowser();
  try {
    const r = await measure(session, url, {width: Number(width), height: 1000, ready, init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    console.log(JSON.stringify(r, null, 1));
  } finally { close(); }
}
