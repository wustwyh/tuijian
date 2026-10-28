import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 40) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
try {
  await measure(session, "http://localhost:5173/create/product", {width: 1440, height: 1000, settle: 1600, ready: ".grid-product", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector('.grid-product button').click()`); await sleep(400);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(1000);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(1000);
  await session.evaluate(`[...document.querySelectorAll('.pf-pick')][0]?.click()`); await sleep(400);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(1400);
  await session.evaluate(`[...document.querySelectorAll('.topic-card')].find(x=>x.textContent.includes('迁移'))?.click()`); await sleep(300);
  await session.evaluate(`document.querySelector('.discovery-trigger').click()`);
  await waitFor(`document.querySelectorAll('.dq-card').length >= 3`, 45);
  // 再问一轮
  const before = await session.evaluate(`document.querySelectorAll('.dq-card').length`);
  await session.evaluate(`[...document.querySelectorAll('.dq-actions button')].find(b=>b.textContent.includes('再问一轮'))?.click()`);
  const after = await waitFor(`document.querySelectorAll('.dq-card').length > ${before} ? document.querySelectorAll('.dq-card').length : 0`, 40);
  const newQ = await session.evaluate(`document.querySelectorAll('.dq-card h3')[${before}]?.textContent || ''`);
  console.log(`再问一轮: ${before} → ${after} 题｜新题: ${newQ.slice(0,40)}`);
  // 就按推荐写
  const t0 = Date.now();
  await session.evaluate(`[...document.querySelectorAll('.dq-actions button')].find(b=>b.textContent.includes('就这样'))?.click()`);
  const done = await waitFor(`document.querySelector('.discovery-done-badge') ? 'done' : ''`, 60);
  const summary = await session.evaluate(`(document.querySelector('.discovery-summary')?.textContent || '').length`);
  console.log(`结束梳理: ${done}｜${Math.round((Date.now()-t0)/1000)}s｜摘要 ${summary} 字`);
  await session.evaluate(`[...document.querySelectorAll('.discovery-modal-actions button')].find(b=>b.textContent.includes('填入额外要求'))?.click()`);
  await sleep(600);
  console.log('额外要求已填:', await session.evaluate(`(document.querySelector('.extra')?.value || '').length`));
} finally { close(); }
