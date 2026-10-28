import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 980, settle: 2800, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-device button")].find(b => b.textContent.includes("电脑")).click()`);
  await sleep(1200);
  console.log(await session.evaluate(`(() => {
    const f = document.querySelector(".wb-frame iframe");
    const d = f.contentDocument;
    const pf = d.querySelector(".pf");
    const stage = document.querySelector(".wb-stage");
    const fr = f.getBoundingClientRect(), pr = pf.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return JSON.stringify({
      stage: [Math.round(sr.width), Math.round(sr.left)],
      frame: [Math.round(fr.width), Math.round(fr.left)],
      innerBody: Math.round(d.body.getBoundingClientRect().width),
      innerViewport: d.documentElement.clientWidth,
      pf: [Math.round(pr.width), Math.round(pr.left)],
      pfStyle: [getComputedStyle(pf).maxWidth, getComputedStyle(pf).margin],
      bodyStyle: [getComputedStyle(d.body).padding, getComputedStyle(d.body).maxWidth],
    });
  })()`));
} finally { close(); }
