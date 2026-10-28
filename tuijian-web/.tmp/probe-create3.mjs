import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/create/product", {width: 1440, height: 1000, settle: 1500, ready: ".grid-product", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector('.grid-product button').click()`); await sleep(400);
  await session.evaluate(`[...document.querySelectorAll('button')].find(x=>/下一步/.test(x.textContent))?.click()`); await sleep(1200);
  const info = await session.evaluate(`JSON.stringify({
    path: location.pathname,
    buttons: [...document.querySelectorAll('button')].map(b=>({t:b.textContent.trim().slice(0,20), cls:b.className, dis:b.disabled})).slice(0,26),
    auds: document.querySelectorAll('.grid-aud button').length,
  }, null, 1)`);
  console.log(info);
} finally { close(); }
