import {openBrowser, measure} from "./cdp.mjs";
const id = process.argv[2];
const {session, close} = await openBrowser();
try {
  const r = await measure(session, `http://localhost:5173/result/${id}`, {width: 1440, height: 1000, settle: 1500, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  // 打开逐段修改
  const opened = await session.evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('逐段修改')); if(!b) return 'no-button'; b.click(); return 'clicked'; })()`);
  await new Promise(r => setTimeout(r, 600));
  const before = JSON.parse(await session.evaluate(`JSON.stringify({
    paragraphs: document.querySelectorAll('.article-paragraph textarea').length,
    counters: [...document.querySelectorAll('.article-field>span b, .article-paragraphs-head b')].map(b=>b.textContent),
    fields: [...document.querySelectorAll('.article-field>span')].map(s=>s.textContent.slice(0,12)),
  })`));
  // 改第一段，追加一句
  await session.evaluate(`(() => {
    const ta = document.querySelector('.article-paragraph textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ta.value + '（测试后自动撤回）');
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    return ta.value.slice(-12);
  })()`);
  await new Promise(r => setTimeout(r, 300));
  const submit = await session.evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('保存并重新核验')); if(!b) return 'no-submit'; b.click(); return b.textContent; })()`);
  const t0 = Date.now();
  let state = {};
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000));
    state = JSON.parse(await session.evaluate(`JSON.stringify({
      notice: document.querySelector('.product-notice')?.textContent || '',
      editing: Boolean(document.querySelector('.article-editor')),
      badge: document.querySelector('#r-review .result-badge')?.textContent || '',
      busy: !!document.querySelector('.article-editor button[disabled]'),
      checks: document.querySelectorAll('#r-review .verification-row').length,
      bodyHasEdit: (document.querySelector('#r-article')?.innerText || '').includes('已人工微调'),
    })`));
    if (state.notice.includes('重新核验')) break;
  }
  console.log(JSON.stringify({opened, submit, before, after: state, waitedSec: Math.round((Date.now()-t0)/1000), errors: r.errors}, null, 1));
  // 测试写完立刻撤回，避免把测试文字留在真实记录里
  await fetch(`http://localhost:5173/api/generations/${id}/restore`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
  console.log('已撤回测试改动');
} finally { close(); }
