import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 45) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
try {
  const r = await measure(session, "http://localhost:5173/result/9f3a72b8-0aae-4a7d-b077-5daee03d52c6", {width: 1440, height: 950, settle: 2200, ready: "#r-review", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log('03 区（被拦截）:', await session.evaluate(`JSON.stringify({blocked: !!document.querySelector('#r-article .result-error'), entry: !!document.querySelector('.article-edit-entry'), previewHidden: !document.querySelector('#r-article .generated-article')})`));
  console.log('按这条改 按钮数:', await session.evaluate(`document.querySelectorAll('.fix-action').length`));
  await session.evaluate(`document.querySelector('.fix-action')?.click()`);
  const open = await waitFor(`document.querySelector('.wb') ? 'yes' : ''`, 20);
  const chips = await waitFor(`document.querySelectorAll('.wb-chips .wb-chip').length >= 3 ? document.querySelectorAll('.wb-chips .wb-chip').length : 0`, 40);
  console.log('点按这条改 → 工作台:', open, '｜关键词:', chips, '｜当前 tab:', await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b=>b.className.includes('is-on'))?.textContent.trim()`));
  console.log('面板抬头:', await session.evaluate(`document.querySelector('.wb-panel-head strong')?.textContent + ' / ' + document.querySelector('.wb-panel-head em')?.textContent`));
  console.log('errors:', JSON.stringify(r.errors));
} finally { close(); }
