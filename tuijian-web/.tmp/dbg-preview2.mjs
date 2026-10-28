import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const url = process.argv[2] || "http://localhost:5173/result/4e0ca6eb-fef7-4d99-bf34-d7ff117dc4f7";
try {
  await measure(session, url, {width: 1280, height: 900, settle: 1800, ready: ".result-actions", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('预览发布稿')).click()`);
  const t0 = Date.now();
  let last = '';
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    last = await session.evaluate(`JSON.stringify({frame: Boolean(document.querySelector('iframe.pp-frame')), state: document.querySelector('.pp-state')?.textContent?.slice(0,60) || '', size: document.querySelector('.pp-title span')?.textContent || ''})`);
    if (JSON.parse(last).frame) break;
  }
  console.log(`等待 ${Date.now() - t0}ms →`, last);
  const detail = await session.evaluate(`(() => { const f = document.querySelector('iframe.pp-frame'); const d = f?.contentDocument; return JSON.stringify({docChars: d ? d.documentElement.outerHTML.length : 0, text: d ? d.body.innerText.slice(0,60).replace(/\\s+/g,' ') : '', imgs: d ? d.querySelectorAll('img').length : 0, loaded: d ? [...d.images].filter(i=>i.complete&&i.naturalWidth>0).length : 0, scrollH: d ? d.documentElement.scrollHeight : 0}); })()`);
  console.log("iframe:", detail);
} finally { close(); }
