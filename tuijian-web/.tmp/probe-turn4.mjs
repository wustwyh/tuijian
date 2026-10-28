import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 3000, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1500);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(1500);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI")).click()`);
  await sleep(1000);
  console.log("before click:", await session.evaluate(`JSON.stringify(window.__turnDbg)`));
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("更口语"))?.click()`);
  await sleep(1500);
  console.log("after click:", await session.evaluate(`JSON.stringify(window.__turnDbg)`));
  await sleep(4000);
  console.log("ui:", await session.evaluate(`JSON.stringify({q: document.querySelector(".wb-turn-q")?.textContent, an: !!document.querySelector(".wb-analysis"), err: document.querySelector(".wb-error")?.textContent})`));
} finally { close(); }
