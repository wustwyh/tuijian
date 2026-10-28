import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const r = await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 950, settle: 2200, ready: "#r-review", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log('fix-action 数量:', await session.evaluate(`document.querySelectorAll('.fix-action').length`));
  console.log('disabled:', await session.evaluate(`document.querySelector('.fix-action')?.disabled`));
  await session.evaluate(`document.querySelector('.fix-action')?.click()`);
  await sleep(1500);
  console.log('工作台:', await session.evaluate(`!!document.querySelector('.wb')`));
  console.log('关键词数:', await session.evaluate(`document.querySelectorAll('.wb-chips .wb-chip').length`));
  console.log('errors:', JSON.stringify(r.errors));
} finally { close(); }
