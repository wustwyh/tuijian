import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`window.__errs=[]; window.__reqs=[]; const of=window.fetch; window.fetch=function(...a){ window.__reqs.push(String(a[0])); return of.apply(this,a); }; window.addEventListener("error", e => window.__errs.push(String(e.message)));`);
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI")).click()`);
  await sleep(800);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("更口语"))?.click()`);
  await sleep(6000);
  console.log("reqs:", await session.evaluate(`JSON.stringify(window.__reqs)`));
  console.log("state:", await session.evaluate(`JSON.stringify({turn: !!document.querySelector(".wb-turn"), q: document.querySelector(".wb-turn-q")?.textContent, analysis: !!document.querySelector(".wb-analysis"), err: document.querySelector(".wb-error")?.textContent, errs: window.__errs})`));
} finally { close(); }
