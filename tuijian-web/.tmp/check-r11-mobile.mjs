import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 390, height: 844, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("自己提需求")).click()`);
  await sleep(500);
  console.log(await session.evaluate(`JSON.stringify({
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    sideW: Math.round(document.querySelector(".wb-side")?.getBoundingClientRect().width || 0),
    steps: [...document.querySelectorAll(".wb-step h4")].map(h => h.textContent.trim()),
    own: !!document.querySelector(".wb-own"),
    scope: [...document.querySelectorAll(".wb-scope button")].map(b => b.textContent.trim()),
  })`));
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  (await import("node:fs")).writeFileSync(".tmp/shots/r11-mobile-panel.png", Buffer.from(cap.data, "base64"));
} finally { close(); }
