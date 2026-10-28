import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  for (const w of [3440, 1920, 1400, 1280, 1000, 760, 390, 360]) {
    const r = await measure(session, "http://localhost:5173/workflows", {width: w, height: 1000, settle: 900, ready: ".workflows-page", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    const info = await session.evaluate(`(() => {
      const vw = document.documentElement.clientWidth;
      const hero = document.querySelector('.wf-hero').getBoundingClientRect();
      return JSON.stringify({docW: document.documentElement.scrollWidth, vw, heroLeft: Math.round(hero.left), heroRight: Math.round(hero.right), over: Math.round(hero.right - vw)});
    })()`);
    console.log(w, "→", info, "| clipped:", r.clipped.length, "overflowX:", r.hOverflow);
  }
} finally { close(); }
