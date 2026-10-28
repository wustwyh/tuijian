import {openBrowser, measure} from "./cdp.mjs";
const base = "http://localhost:5173";
const jobs = {
  wechat: "598058b7-ce0b-46d6-94b2-467a111e96fb",
  zhihu: "304f1716-7c44-4035-878a-96a349fbfc16",
  moments: "4e0ca6eb-fef7-4d99-bf34-d7ff117dc4f7",
};
const {session, close} = await openBrowser();
try {
  for (const [name, id] of Object.entries(jobs)) {
    for (const width of [1400, 390]) {
      const r = await measure(session, `${base}/result/${id}`, {width, height: 900, settle: 900,
        init: ["localStorage.setItem('tuijian_user','演示账号')"]});
      const probe = JSON.parse(await session.evaluate(`JSON.stringify({
        headings: document.querySelectorAll('.article-heading').length,
        h3text: [...document.querySelectorAll('.article-heading')].slice(0,2).map(e=>e.textContent),
        hashCount: (document.querySelector('.article-flow')?.innerText.match(/##/g)||[]).length,
        starCount: (document.body.innerText.match(/\\*\\*/g)||[]).length,
        momentPost: document.querySelectorAll('.moment-post').length,
        momentTextLen: document.querySelector('.moment-text')?.textContent.length ?? null,
        expand: document.querySelectorAll('.moment-more').length,
        gridImgs: document.querySelectorAll('.moment-grid img').length,
        note: document.querySelector('.moment-note')?.textContent ?? null,
      })`));
      console.log(name, width, JSON.stringify(probe), r.errors.length ? "ERR " + JSON.stringify(r.errors) : "no-errors");
    }
  }
} finally { close(); }
