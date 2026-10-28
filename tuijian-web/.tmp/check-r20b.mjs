import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 150) => { for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(1000); } return false; };
const shot = async n => { const c = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false}); writeFileSync(".tmp/shots/" + n, Buffer.from(c.data, "base64")); };
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1400);
  await session.evaluate(`[...document.querySelectorAll(".wb-scope button")].find(b => b.textContent.includes("整篇")).click()`);
  await sleep(700);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI")).click()`);
  await sleep(600);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("短一点"))?.click()`);
  const q = await waitFor(`document.querySelector(".wb-turn-q") ? 1 : 0`, 90);
  console.log("整篇追问:", q, await session.evaluate(`document.querySelector(".wb-turn-q")?.textContent`));
  await shot("r20-turn-whole.png");
  for (let i = 0; i < 3; i++) {
    if (await session.evaluate(`!!document.querySelector(".wb-analysis")`)) break;
    if (!(await session.evaluate(`!!document.querySelector(".wb-turn-q")`))) { await sleep(2000); continue; }
    await session.evaluate(`document.querySelectorAll(".wb-turn .wb-chip")[0].click()`);
    await sleep(4000);
  }
  console.log("整篇按钮:", await session.evaluate(`document.querySelector(".wb-btn-primary")?.innerText.replace(/\\n/g, " / ")`));
  await session.evaluate(`document.querySelector(".wb-btn-primary").click()`);
  await waitFor(`document.querySelectorAll(".wb-cmp-pane iframe").length === 2`, 180);
  await sleep(1500);
  await session.evaluate(`document.querySelector(".wb-cmp-actions .wb-btn-apply").click()`);
  await sleep(800);
  console.log("整版对比保存键:", await session.evaluate(`JSON.stringify([...document.querySelectorAll(".wb-cmp-actions button")].map(b => b.textContent.trim()))`));
  await shot("r20-whole-save.png");
} finally { close(); }
