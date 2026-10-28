import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 120) => { for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(1000); } return false; };
const shot = async n => { const c = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false}); writeFileSync(".tmp/shots/" + n, Buffer.from(c.data, "base64")); };
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1300);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI")).click()`);
  await sleep(600);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("更口语"))?.click()`);
  await waitFor(`!!document.querySelector(".wb-turn-q")`, 90);
  await sleep(500);
  await shot("r20-turn.png");
  for (let i = 0; i < 3; i++) {
    if (await session.evaluate(`!!document.querySelector(".wb-analysis")`)) break;
    if (!(await session.evaluate(`!!document.querySelector(".wb-turn-q")`))) { await sleep(2500); continue; }
    await session.evaluate(`document.querySelectorAll(".wb-turn .wb-chip")[0].click()`);
    await sleep(4500);
  }
  await shot("r20-req-on-button.png");
} finally { close(); }
