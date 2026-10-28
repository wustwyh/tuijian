import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 45) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
try {
  await measure(session, "http://localhost:5173/create/product", {width: 390, height: 844, settle: 1600, ready: ".grid-product", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector('.grid-product button').click()`); await sleep(400);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(900);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(900);
  await session.evaluate(`[...document.querySelectorAll('.pf-pick')][0]?.click()`); await sleep(400);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(1300);
  await session.evaluate(`[...document.querySelectorAll('.topic-card')].find(x=>x.textContent.includes('迁移'))?.click()`); await sleep(300);
  await session.evaluate(`document.querySelector('.discovery-trigger').click()`);
  const n = await waitFor(`document.querySelectorAll('.dq-card').length >= 3 ? document.querySelectorAll('.dq-card').length : 0`, 45);
  console.log('梳理@390:', await session.evaluate(`JSON.stringify({
    cards: document.querySelectorAll('.dq-card').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    modalW: Math.round(document.querySelector('.discovery-modal')?.getBoundingClientRect().width || 0),
    modalScrolls: (()=>{const m=document.querySelector('.discovery-modal');return m ? m.scrollHeight > m.clientHeight : false})(),
    optionW: Math.round(document.querySelector('.dq-option')?.getBoundingClientRect().width || 0),
    actions: [...document.querySelectorAll('.dq-actions button')].map(b=>b.textContent.trim().slice(0,10)),
  })`));
} finally { close(); }
