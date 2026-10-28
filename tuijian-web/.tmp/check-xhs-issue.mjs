import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const id = "4c0c91ef-2809-4034-9b88-f10cba7ce63d";
try {
  await measure(session, "http://localhost:5173/result/" + id, {width: 1440, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3200);
  // 预览模式：检查 iframe 里是否有可点的翻页按钮、脚本是否被 sandbox 拦
  console.log("预览 iframe sandbox:", await session.evaluate(`document.querySelector(".phone-frame iframe")?.getAttribute("sandbox")`));
  console.log("预览 nav 按钮:", await session.evaluate(`(() => { const f=document.querySelector(".phone-frame iframe"); const d=f.contentDocument; return JSON.stringify({btns: d.querySelectorAll(".nav button").length, active: d.querySelectorAll(".card.is-active").length, idx: d.querySelector(".nav-idx")?.textContent}); })()`));
  const before = await session.evaluate(`(() => { const d=document.querySelector(".phone-frame iframe").contentDocument; return d.querySelector(".nav-idx")?.textContent; })()`);
  await session.evaluate(`(() => { const d=document.querySelector(".phone-frame iframe").contentDocument; d.querySelectorAll(".nav button")[1].click(); })()`);
  await sleep(600);
  console.log("点下一张:", before, "→", await session.evaluate(`(() => { const d=document.querySelector(".phone-frame iframe").contentDocument; return d.querySelector(".nav-idx")?.textContent; })()`));

  // 切到修改，点一段文字
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1500);
  await session.evaluate(`document.querySelector(".wb .xhs-card.is-active .edit-hit")?.click()`);
  await sleep(1200);
  console.log("选中后高亮元素:", await session.evaluate(`JSON.stringify({
    selected: document.querySelectorAll(".wb .is-selected").length,
    cards: [...document.querySelectorAll(".wb .xhs-card")].map(c => (c.className.match(/is-active/) ? "A" : "-") + (getComputedStyle(c).outlineStyle !== "none" ? "O" : "")).join(""),
    outlineOnActive: (() => { const c = document.querySelector(".wb .xhs-card.is-active"); return c ? getComputedStyle(c).outlineStyle + " " + getComputedStyle(c).outlineColor : null; })(),
  })`));
  // 换下一张卡
  await session.evaluate(`document.querySelector(".wb .xhs-nav button:last-child")?.click()`);
  await sleep(600);
  console.log("翻页后:", await session.evaluate(`JSON.stringify({selected: document.querySelectorAll(".wb .is-selected").length, activeOutline: (() => { const c = document.querySelector(".wb .xhs-card.is-active"); return c ? getComputedStyle(c).outlineStyle : null; })()})`));
  // 换成预览
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("预览")).click()`);
  await sleep(2000);
  console.log("预览模式残留高亮:", await session.evaluate(`JSON.stringify({selected: document.querySelectorAll(".wb .is-selected").length, cards: document.querySelectorAll(".wb .xhs-card").length})`));
} finally { close(); }
