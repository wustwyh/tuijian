import {openBrowser, measure} from "./cdp.mjs";
const {writeFileSync} = await import("node:fs");
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 45) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
const shot = async out => { const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false}); writeFileSync(out, Buffer.from(cap.data, "base64")); };
try {
  // 390 手机：工作台
  const r = await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 390, height: 844, settle: 2000, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('#r-article button')].find(b=>b.textContent.includes('打开工作台'))?.click()`);
  await sleep(2400);
  console.log('手机工作台:', await session.evaluate(`JSON.stringify({
    open: !!document.querySelector('.wb'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    headH: Math.round(document.querySelector('.wb-head')?.getBoundingClientRect().height||0),
    frameW: Math.round(document.querySelector('.wb-frame iframe')?.getBoundingClientRect().width||0),
    sideH: Math.round(document.querySelector('.wb-side')?.getBoundingClientRect().height||0),
  })`));
  await shot('.tmp/shots/workbench-mobile.png');
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b=>b.textContent.includes('修改'))?.click()`);
  await sleep(900);
  console.log('手机修改态:', await session.evaluate(`JSON.stringify({hits: document.querySelectorAll('.edit-hit').length, renderW: Math.round(document.querySelector('.wb-render-inner')?.getBoundingClientRect().width||0)})`));
  console.log('errors:', JSON.stringify(r.errors));
  // 04 按这条改 → 打开工作台并出候选
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 950, settle: 2000, ready: "#r-review"});
  const fixes = await session.evaluate(`document.querySelectorAll('.fix-action').length`);
  await session.evaluate(`document.querySelector('.fix-action')?.click()`);
  const chips = await waitFor(`document.querySelectorAll('.wb-chips .wb-chip').length >= 3 ? document.querySelectorAll('.wb-chips .wb-chip').length : 0`, 40);
  console.log('按这条改 → 工作台已开:', await session.evaluate(`!!document.querySelector('.wb')`), '｜修正候选关键词:', chips);
} finally { close(); }
