import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const r = await measure(session, "http://localhost:5199/result/46ab43bb-b0a3-4662-af89-ff80d5d8ec9a", {width: 1440, height: 1000, settle: 3200, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log("errors:", JSON.stringify(r.errors).slice(0, 300));
  console.log(await session.evaluate(`JSON.stringify({
    title: document.querySelector(".rs-hero h1, .rs-title")?.textContent?.slice(0, 30),
    cards: document.querySelectorAll(".rs-card").length,
    materials: document.querySelector(".rs-fold") ? 1 : 0,
    brokenImgs: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
    imgs: document.images.length,
    folds: [...document.querySelectorAll(".rs-fold summary")].map(s => s.textContent.trim().slice(0, 12)),
  })`));
  await session.evaluate(`document.querySelector(".rs-main-btn")?.click()`);
  await sleep(3000);
  console.log("workbench:", await session.evaluate(`JSON.stringify({open: !!document.querySelector(".wb"), cards: document.querySelectorAll(".xhs-card, .pf .card").length, body: document.querySelector(".wb-stage")?.innerText?.slice(0, 40)})`));
} finally { close(); }
