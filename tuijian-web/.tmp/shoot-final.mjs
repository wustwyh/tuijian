import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async id => {
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  writeFileSync(".tmp/shots/" + id, Buffer.from(cap.data, "base64"));
};
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {
    width: 1440, height: 980, settle: 2800, ready: ".rs-top",
    init: ["localStorage.setItem(" + JSON.stringify("tuijian_user") + "," + JSON.stringify("演示账号") + ")"],
  });
  await shot("final-result.png");
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3200);
  await shot("final-wb-phone.png");
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click() || document.querySelector(".wb .edit-hit")?.click()`);
  await sleep(3000);
  await shot("final-wb-edit.png");
} finally { close(); }
