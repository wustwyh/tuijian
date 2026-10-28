import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/create/product", {width: 1440, height: 1000, settle: 1600, ready: ".grid-product", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector('.grid-product button').click()`); await sleep(400);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(1200);
  console.log('audience:', await session.evaluate('location.pathname'));
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(1200);
  console.log('platform:', await session.evaluate('location.pathname'));
  await session.evaluate(`document.querySelector('.pf-pick')?.click()`); await sleep(400);
  const opts = await session.evaluate(`JSON.stringify({tasks:document.querySelectorAll('.task-pick, .task, .chip').length, buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim().slice(0,14)).slice(0,20)})`);
  console.log(opts);
  await session.evaluate(`document.querySelector('.step-next')?.click()`); await sleep(1400);
  console.log('topic:', await session.evaluate('location.pathname'));
  console.log('trigger:', await session.evaluate(`JSON.stringify({trigger:!!document.querySelector('.discovery-trigger'), disabled:document.querySelector('.discovery-trigger')?.disabled, topics:document.querySelectorAll('.topic-card').length})`));
} finally { close(); }
