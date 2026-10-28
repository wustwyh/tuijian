import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 900, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log(await session.evaluate(`JSON.stringify({
    scrollY: window.scrollY,
    docScroll: document.scrollingElement?.scrollTop,
    bodyH: document.body.scrollHeight,
    mainScroll: (() => { const el = document.querySelector(".main-scroll, .app-main, main"); return el ? [el.className, el.scrollTop, el.scrollHeight, el.clientHeight] : null; })(),
  })`));
  await session.evaluate(`window.scrollTo(0, 900)`);
  await sleep(600);
  console.log("滚 900 后:", await session.evaluate(`JSON.stringify({y: window.scrollY, backtop: !!document.querySelector('.rs-backtop')})`));
  await session.evaluate(`document.getElementById('r-review').scrollIntoView()`);
  await sleep(800);
  console.log("scrollIntoView 后:", await session.evaluate(`JSON.stringify({y: window.scrollY, backtop: !!document.querySelector('.rs-backtop'), rail: document.querySelector('.rs-rail button.is-on')?.textContent.trim()})`));
} finally { close(); }
