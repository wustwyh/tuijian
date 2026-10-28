import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 980, settle: 2800, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-device button")].find(b => b.textContent.includes("电脑")).click()`);
  await sleep(1000);
  console.log(await session.evaluate(`(() => {
    const st = document.querySelector(".wb-stage");
    const f = st.querySelector("iframe");
    return JSON.stringify({
      stageHTML: st.innerHTML.slice(0, 260),
      iframeParent: f?.parentElement?.className,
      iframeStyle: f ? [f.getBoundingClientRect().width, getComputedStyle(f).width, getComputedStyle(f).display] : null,
      parentDisplay: getComputedStyle(f.parentElement).display,
      ruleMatch: (() => {
        for (const sheet of document.styleSheets) {
          try { for (const r of sheet.cssRules) if (r.cssText && r.cssText.includes("wb-frame>iframe")) return r.cssText.slice(0, 120); } catch {}
        }
        return "not found";
      })(),
    });
  })()`));
} finally { close(); }
