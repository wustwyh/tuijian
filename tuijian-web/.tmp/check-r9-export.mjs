import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  for (const k of ["article","news","qa","feed","poster","moment","doc","card"]) {
    await measure(session, "file:///E:/codes/创业/10.18黑客松/tuijian-web/.tmp/pub-" + k + ".html", {width: 1280, height: 900, settle: 900});
    console.log(k.padEnd(7), await session.evaluate(`(() => {
      const pf = document.querySelector(".pf"), r = pf?.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      return JSON.stringify({
        w: Math.round(r?.width || 0),
        centered: r ? Math.round(r.left - (vw - r.right)) : null,
        name: document.querySelector(".pf-name")?.textContent,
        follow: !!document.querySelector(".pf-follow"),
      });
    })()`));
  }
  await measure(session, "file:///E:/codes/创业/10.18黑客松/tuijian-web/.tmp/pub-moment.html", {width: 1280, height: 900, settle: 900});
  console.log("朋友圈折叠文本:", await session.evaluate(`(() => {
    const t = document.querySelector(".moment-text, .post .text, .pf-body")?.innerText || "";
    const i = t.indexOf("…");
    return JSON.stringify({endsWithEllipsis: /…\\s*$/.test(t.trim()), ellipsisAt: i, tailLen: i >= 0 ? t.trim().length - i : null, sample: t.slice(Math.max(0,i-20), i+30)});
  })()`));
} finally { close(); }
