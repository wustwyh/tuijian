import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const id = process.argv[2];
try {
  const r = await measure(session, `http://localhost:5173/result/${id}`, {width: 390, height: 844, settle: 1800, ready: ".result-actions", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const header = await session.evaluate(`JSON.stringify({headerBtn: Boolean(document.querySelector('.section-action-btn')), text: document.querySelector('.section-action-btn')?.textContent || '', visible: (() => { const b = document.querySelector('.section-action-btn'); if (!b) return false; const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()})`);
  console.log("390 头部按钮:", header);
  await session.evaluate(`(document.querySelector('.section-action-btn') || [...document.querySelectorAll('button')].find(b => b.textContent.includes('预览发布稿'))).click()`);
  for (let i = 0; i < 30; i++) { await new Promise((res) => setTimeout(res, 500)); if (await session.evaluate("Boolean(document.querySelector('iframe.pp-frame'))")) break; }
  const m = await session.evaluate(`(() => { const d = document.querySelector('.pp-dialog'); const f = document.querySelector('iframe.pp-frame'); const b = d.getBoundingClientRect(); return JSON.stringify({w: Math.round(b.width), h: Math.round(b.height), vw: innerWidth, vh: innerHeight, frameH: Math.round(f.getBoundingClientRect().height), docW: f.contentDocument.documentElement.clientWidth, docH: f.contentDocument.documentElement.scrollHeight, hOverflow: f.contentDocument.documentElement.scrollWidth > f.contentDocument.documentElement.clientWidth + 1}); })()`);
  console.log("390 弹窗:", m);
  console.log("errors:", JSON.stringify(r.errors), "| 页面横向溢出:", r.hOverflow);
} finally { close(); }
