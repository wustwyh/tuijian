import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 1000, settle: 2500, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const info = await session.evaluate(`(() => {
    const order = [...document.querySelectorAll('.result-main > [id], .result-main section[id], .result-main details[id]')]
      .map(el => el.id).filter((id, i, a) => id && a.indexOf(id) === i);
    const rail = [...document.querySelectorAll('.result-rail button span')].map(s => s.textContent);
    return JSON.stringify({
      ids: order,
      rail,
      autoDialog: Boolean(document.querySelector('.pp-dialog')),
      packageBeforeArticle: (() => {
        const p = document.getElementById('r-package'), a = document.getElementById('r-article');
        return p && a ? (p.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING) !== 0 : null;
      })(),
    });
  })()`);
  console.log(info);
} finally { close(); }
