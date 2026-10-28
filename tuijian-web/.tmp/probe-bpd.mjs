import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const id = 'b081e220-517b-4241-ac8e-0d5bb2861a71';
try {
  await measure(session, 'http://localhost:5173/result/' + id, {
    width: 1400, height: 900, settle: 2500, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  const out = await session.evaluate(`(async () => {
    const mod = await import('/src/export.js');
    const job = await (await fetch('/api/generations/${id}')).json();
    const article = job.result.article;
    const t0 = Date.now();
    try {
      const html = await mod.buildPublishDoc({...job, result: {...job.result, article}});
      return JSON.stringify({ok: true, ms: Date.now() - t0, len: html.length, imgs: (article.image_plan||[]).length, first: (article.image_plan||[])[0] && Object.keys((article.image_plan||[])[0])});
    } catch (e) {
      return JSON.stringify({ok: false, ms: Date.now() - t0, err: String(e && e.message || e)});
    }
  })()`);
  console.log(out);
} finally {
  close();
}
