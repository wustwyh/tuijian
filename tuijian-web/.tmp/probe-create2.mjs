import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const next = async () => { await session.evaluate(`[...document.querySelectorAll('button')].find(x=>/下一步|继续/.test(x.textContent))?.click()`); await sleep(900); };
const log = async label => console.log(label, '→', await session.evaluate('location.pathname'));
try {
  await measure(session, "http://localhost:5173/create/product", {width: 1440, height: 1000, settle: 1500, ready: ".grid-product", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector('.grid-product button').click()`); await sleep(500);
  await next(); await log('after product');
  await session.evaluate(`document.querySelector('.grid-aud button')?.click()`); await sleep(500);
  await next(); await log('after audience');
  await session.evaluate(`document.querySelector('.pf-pick')?.click()`); await sleep(500);
  await session.evaluate(`[...document.querySelectorAll('button')].find(x=>/下一步|继续/.test(x.textContent))?.click()`); await sleep(1200); await log('after platform');
  const opts = await session.evaluate(`JSON.stringify({topics:document.querySelectorAll('.topic-card').length, trigger:!!document.querySelector('.discovery-trigger'), disabled:document.querySelector('.discovery-trigger')?.disabled})`);
  console.log('topic page:', opts);
} finally { close(); }
