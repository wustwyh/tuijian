import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`window.__errs=[]; window.addEventListener("error", e => window.__errs.push(String(e.message))); window.addEventListener("unhandledrejection", e => window.__errs.push(String(e.reason && e.reason.message || e.reason)));`);
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  console.log("open:", await session.evaluate(`!!document.querySelector(".wb")`), await session.evaluate(`JSON.stringify(window.__errs)`));
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1500);
  console.log("edit:", await session.evaluate(`!!document.querySelector(".wb-side")`), await session.evaluate(`JSON.stringify(window.__errs)`));
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(1800);
  console.log("panel:", await session.evaluate(`JSON.stringify({side: (document.querySelector(".wb-side")?.innerText || "").slice(0,60), steps: document.querySelectorAll(".wb-step h4").length, tabs: document.querySelectorAll(".wb-tabbar button").length})`));
  console.log("errs:", await session.evaluate(`JSON.stringify(window.__errs)`));
} finally { close(); }
