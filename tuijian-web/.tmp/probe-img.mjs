import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 1000, settle: 2600, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log(await session.evaluate(`(() => {
    const img = document.querySelector('#r-article figure img');
    const shot = document.querySelector('#r-article .article-shot');
    const cs = img && getComputedStyle(img);
    const ss = shot && getComputedStyle(shot);
    return JSON.stringify({
      src: (img?.src || '').slice(0, 30),
      natural: img ? [img.naturalWidth, img.naturalHeight] : null,
      complete: img?.complete,
      imgCss: cs ? {w: cs.width, h: cs.height, maxW: cs.maxWidth, maxH: cs.maxHeight, display: cs.display} : null,
      shotCss: ss ? {w: ss.width, d: ss.display} : null,
      figures: document.querySelectorAll('#r-article figure').length,
    });
  })()`));
} finally { close(); }
