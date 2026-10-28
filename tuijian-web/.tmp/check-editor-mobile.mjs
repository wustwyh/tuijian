import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 390, height: 844, settle: 1200, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('逐段修改'))?.click()`);
  await new Promise(r => setTimeout(r, 500));
  const info = await session.evaluate(`(() => {
    const box = document.querySelector('.article-paragraphs')?.getBoundingClientRect();
    const ta = document.querySelector('.article-paragraph textarea')?.getBoundingClientRect();
    const actions = document.querySelector('.article-editor-actions')?.getBoundingClientRect();
    return JSON.stringify({
      paragraphs: document.querySelectorAll('.article-paragraph textarea').length,
      boxW: box ? Math.round(box.width) : 0,
      taW: ta ? Math.round(ta.width) : 0,
      actionsW: actions ? Math.round(actions.width) : 0,
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      saveVisible: Boolean(document.querySelector('.article-editor-actions .btn-primary')),
    });
  })()`);
  console.log(info);
} finally { close(); }
