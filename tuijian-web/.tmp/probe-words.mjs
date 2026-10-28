import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 900, settle: 2200, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log(await session.evaluate(`(() => {
    const inView = [];
    const walk = el => {
      const r = el.getBoundingClientRect();
      if (r.top < 900 && r.bottom > 0 && el.children.length === 0 && el.textContent.trim()) inView.push(el.textContent.trim());
      for (const c of el.children) walk(c);
    };
    walk(document.querySelector(".result-page"));
    const text = inView.join(" ").replace(/\\s+/g, "");
    const vh = window.innerHeight;
    const arr = [];
    const walk2 = el => { const r = el.getBoundingClientRect(); if (r.top < 900 && r.bottom > 0 && el.children.length === 0 && el.textContent.trim()) arr.push(el.textContent.trim()); for (const c of el.children) walk2(c); };
    walk2(document.querySelector(".result-page"));
    return JSON.stringify({
      firstScreenChars: text.length,
      buttons: [...document.querySelectorAll(".rs-top button, .rs-top summary")].map(b => b.textContent.trim() || b.getAttribute("aria-label")),
      pageChars: document.querySelector(".result-page").innerText.replace(/\\s+/g,"").length,
    });
  })()`));
} finally { close(); }
