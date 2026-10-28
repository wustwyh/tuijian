import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const step = async (label, code) => { const out = await session.evaluate(code); console.log(label, '→', out); await sleep(700); return out; };
try {
  await measure(session, "http://localhost:5173/create/product", {width: 1440, height: 1000, settle: 1500, ready: ".grid-product", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await step('选产品', `(() => { const b=document.querySelector('.grid-product button'); if(!b) return 'no'; b.click(); return b.innerText.slice(0,24); })()`);
  await step('下一步', `(() => { const b=[...document.querySelectorAll('button')].find(x=>/下一步|下 一步|继续/.test(x.textContent)); if(!b) return 'no-next'; b.click(); return b.textContent.trim(); })()`);
  await sleep(1200);
  console.log('url after product:', await session.evaluate('location.pathname'));
} finally { close(); }
