import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d", {width: 1440, height: 1400, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1600);
  console.log(await session.evaluate(`(() => {
    const st = document.createElement("style");
    st.id = "force-show";
    st.textContent = ".xhs-card{display:flex !important}";
    document.head.appendChild(st);
    const out = [...document.querySelectorAll(".wb .xhs-card.text")].map((c, i) => {
      const body = c.querySelector(".xhs-body");
      const card = c.getBoundingClientRect();
      return {i, cardH: Math.round(card.height), bodyH: Math.round(body.getBoundingClientRect().height), scroll: body.scrollHeight, over: Math.max(0, body.scrollHeight - body.clientHeight)};
    });
    st.remove();
    return JSON.stringify(out);
  })()`));
} finally { close(); }
