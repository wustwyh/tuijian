import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1000);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("自己提需求")).click()`);
  await sleep(400);
  await session.evaluate(`(() => { const t = document.querySelector(".wb-own .wb-input"); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; set.call(t, "别那么多形容词"); t.dispatchEvent(new Event("input", {bubbles: true})); })()`);
  await sleep(300);
  const btn = await session.evaluate(`(() => { const b = [...document.querySelectorAll(".wb-btn-soft")].find(x => x.textContent.includes("梳理")); return b ? {text: b.textContent.trim(), disabled: b.disabled} : "missing"; })()`);
  console.log("按钮:", JSON.stringify(btn));
  await session.evaluate(`[...document.querySelectorAll(".wb-btn-soft")].find(b => b.textContent.includes("梳理")).click()`);
  await sleep(20000);
  console.log("状态:", await session.evaluate(`JSON.stringify({
    busy: document.querySelector(".wb-state-inline")?.textContent,
    analysis: document.querySelector(".wb-analysis")?.innerText?.slice(0, 80),
    error: document.querySelector(".wb-error")?.textContent,
    hint: document.querySelector(".wb-step:nth-of-type(2) .wb-hint-sm")?.textContent,
  })`));
} finally { close(); }
