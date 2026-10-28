import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  for (const w of [1400, 1280]) {
    const r = await measure(session, "http://localhost:5173/workflows", {width: w, height: 1000, settle: 1200, ready: ".workflows-page", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    const info = await session.evaluate(`(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [...document.querySelectorAll('.workflows-page *')]
        .map(el => ({el, r: el.getBoundingClientRect()}))
        .filter(x => x.r.right > vw + 0.5)
        .map(x => ({sel: (x.el.className ? '.' + String(x.el.className).split(' ')[0] : x.el.tagName.toLowerCase()), right: Math.round(x.r.right), width: Math.round(x.r.width)}))
        .slice(0, 6);
      return JSON.stringify({docW: document.documentElement.scrollWidth, vw, bad});
    })()`);
    console.log(w, "→", info);
  }
} finally { close(); }
