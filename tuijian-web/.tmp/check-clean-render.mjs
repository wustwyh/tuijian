import {openBrowser, measure} from "./cdp.mjs";
const {writeFileSync} = await import("node:fs");
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const r = await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 1000, settle: 2000, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const text = await session.evaluate(`document.querySelector('#r-article')?.innerText || ''`);
  console.log('含「人工微调」:', text.includes('人工微调'));
  console.log('含「测试后」:', text.includes('测试后'));
  console.log('标题行:', await session.evaluate(`document.querySelector('#r-article h2')?.textContent || ''`));
  console.log('首段:', await session.evaluate(`document.querySelector('#r-article .article-heading')?.textContent || ''`));
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  writeFileSync(".tmp/shots/result-clean.png", Buffer.from(cap.data, "base64"));
  console.log('errors:', JSON.stringify(r.errors));
} finally { close(); }
