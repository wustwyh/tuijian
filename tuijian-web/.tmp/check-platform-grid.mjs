import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  for (const width of [1440, 390]) {
    await measure(session, "http://localhost:5173/create/platform", {width, height: 900, settle: 1500, ready: ".grid-pf", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    console.log(width, await session.evaluate(`JSON.stringify({
      cards: document.querySelectorAll('.pf').length,
      cols: getComputedStyle(document.querySelector('.grid-pf')).gridTemplateColumns.split(' ').length,
      names: [...document.querySelectorAll('.pf-name')].map(n=>n.textContent),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    })`));
  }
} finally { close(); }
