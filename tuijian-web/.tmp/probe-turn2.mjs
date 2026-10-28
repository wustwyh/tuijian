import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI")).click()`);
  await sleep(800);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("更口语"))?.click()`);
  for (let i = 0; i < 6; i++) {
    await sleep(2000);
    console.log(i*2+2 + "s", await session.evaluate(`JSON.stringify({side: (document.querySelector(".wb-side")?.innerText || "").replace(/\\n+/g," | ").slice(0, 220)})`));
  }
} finally { close(); }
