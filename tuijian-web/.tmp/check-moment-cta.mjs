import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/f2f1dd63-dc9d-4be1-a7d3-75d462cd94d1", {width: 1440, height: 1000, settle: 2800, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1800);
  console.log("朋友圈修改模式:", await session.evaluate(`JSON.stringify({
    extra: document.querySelectorAll(".edit-extra-targets, .edit-extra-item").length,
    text: (document.querySelector(".wb .moment-text")?.innerText || "").slice(0, 40),
    hits: [...document.querySelectorAll(".wb .edit-hit")].map(e => e.className.replace("edit-hit", "").trim()).slice(0, 6),
  })`));
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  writeFileSync(".tmp/shots/r16-moment-no-cta.png", Buffer.from(cap.data, "base64"));
} finally { close(); }
