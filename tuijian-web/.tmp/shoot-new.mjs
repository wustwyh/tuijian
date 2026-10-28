import {openBrowser, measure} from "./cdp.mjs";
const {writeFileSync} = await import("node:fs");
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async (out) => { const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false}); writeFileSync(out, Buffer.from(cap.data, "base64")); console.log(out); };
try {
  await measure(session, "http://localhost:5173/result/16ae9440-f38d-450d-8c37-81d6bfc1e46d", {width: 1440, height: 1000, settle: 2000, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('预览发布稿'))?.click()`);
  await sleep(2600);
  await shot(".tmp/shots/preview-desktop.png");
  await session.evaluate(`[...document.querySelectorAll('.pp-device button')].find(b=>b.textContent.includes('手机'))?.click()`);
  await sleep(900);
  await shot(".tmp/shots/preview-mobile.png");
  await session.evaluate(`[...document.querySelectorAll('.pp-tabs button')].find(b=>b.textContent.includes('改稿'))?.click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll('.edit-hit')].find(x=>x.dataset.kind==='para')?.click()`);
  for (let i=0;i<25;i++){ if (await session.evaluate(`document.querySelectorAll('.ai-chip').length>=3`)) break; await sleep(1000); }
  await shot(".tmp/shots/edit-inplace.png");
  await measure(session, "http://localhost:5173/create/platform", {width: 1440, height: 1100, settle: 1500, ready: ".grid-pf"});
  await shot(".tmp/shots/platforms-12.png");
} finally { close(); }
