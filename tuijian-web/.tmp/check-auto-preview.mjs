import {openBrowser, measure} from "./cdp.mjs";
const id = process.argv[2];
const {session, close} = await openBrowser();
try {
  await measure(session, `http://localhost:5173/result/${id}`, {width: 1440, height: 1000, settle: 400, ready: "#r-progress", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const t0 = Date.now();
  let snapshot = {};
  for (let i = 0; i < 200; i++) {
    await new Promise(r => setTimeout(r, 2000));
    snapshot = JSON.parse(await session.evaluate(`JSON.stringify({
      status: document.querySelector('.result-sticky-status')?.textContent || '',
      dialog: Boolean(document.querySelector('.pp-dialog')),
      frame: Boolean(document.querySelector('iframe.pp-frame')),
      state: document.querySelector('.pp-state')?.textContent || '',
      elapsed: 0,
    })`));
    if (snapshot.dialog) break;
    const done = ["已确认","待确认","核验通过","生成完成","已拦截","生成失败"];
    if (done.includes(snapshot.status)) { await new Promise(r => setTimeout(r, 2500)); snapshot = JSON.parse(await session.evaluate(`JSON.stringify({status: document.querySelector('.result-sticky-status')?.textContent||'', dialog: Boolean(document.querySelector('.pp-dialog')), frame: Boolean(document.querySelector('iframe.pp-frame')), state: document.querySelector('.pp-state')?.textContent||''})`)); break; }
  }
  console.log(JSON.stringify({...snapshot, waitedSec: Math.round((Date.now() - t0) / 1000)}, null, 1));
} finally { close(); }
