import {openBrowser, measure} from "./cdp.mjs";
const {writeFileSync} = await import("node:fs");
const {session, close} = await openBrowser();
try {
  const r = await measure(session, "http://localhost:5173/create/platform", {width: 1440, height: 1100, settle: 1600, ready: ".grid-pf", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log(await session.evaluate(`JSON.stringify({
    cards: document.querySelectorAll('.pf').length,
    previews: document.querySelectorAll('.pf-preview .ppv').length,
    kinds: [...document.querySelectorAll('.pf-preview .ppv')].map(p=>p.className.replace('ppv ','')),
    size: (()=>{const p=document.querySelector('.pf-preview');const r=p?.getBoundingClientRect();return r?[Math.round(r.width),Math.round(r.height)]:null})(),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  writeFileSync(".tmp/shots/platforms-preview.png", Buffer.from(cap.data, "base64"));
  console.log('errors:', JSON.stringify(r.errors));
} finally { close(); }
