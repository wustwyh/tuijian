import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => { const c = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false}); writeFileSync(".tmp/shots/" + n, Buffer.from(c.data, "base64")); };
const setText = async (sel, text) => session.evaluate(`(() => { const t = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; set.call(t, ${JSON.stringify(text)}); t.dispatchEvent(new Event("input", {bubbles: true})); })()`);
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1600, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1300);
  // 改标题
  await session.evaluate(`document.querySelector(".wb .generated-article h2.edit-hit")?.click()`);
  await sleep(1200);
  const t0 = await session.evaluate(`document.querySelector(".wb-direct")?.value`);
  console.log("标题原文:", String(t0).slice(0, 26));
  await setText(".wb-direct", String(t0) + "，轻到能塞进书包");
  await sleep(300);
  await session.evaluate(`document.querySelector(".wb-direct-foot .wb-btn-apply").click()`);
  await sleep(900);
  console.log("改后:", await session.evaluate(`document.querySelector(".wb .generated-article h2.edit-hit")?.innerText.slice(0, 40)`));
  await shot("r15-direct-title.png");
  // 撤销上一步
  console.log("撤销按钮:", await session.evaluate(`JSON.stringify([...document.querySelectorAll(".wb-direct-foot .wb-chip")].map(b => b.textContent.trim()))`));
  await session.evaluate(`[...document.querySelectorAll(".wb-direct-foot .wb-chip")].find(b => b.textContent.includes("撤销"))?.click()`);
  await sleep(800);
  console.log("撤销后:", await session.evaluate(`document.querySelector(".wb .generated-article h2.edit-hit")?.innerText.slice(0, 40)`));
} finally { close(); }
