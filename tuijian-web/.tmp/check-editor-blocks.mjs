import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 40) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
const id = "b081e220-517b-4241-ac8e-0d5bb2861a71";
try {
  await measure(session, `http://localhost:5173/result/${id}`, {width: 1440, height: 1000, settle: 1500, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='改稿')?.click()`);
  await sleep(700);
  const base = JSON.parse(await session.evaluate(`JSON.stringify({
    blocks: document.querySelectorAll('.art-block').length,
    headings: document.querySelectorAll('.art-heading-text').length,
    parra: document.querySelectorAll('.art-para').length,
    hashes: (document.querySelector('.article-editor')?.innerText || '').includes('##'),
    markers: /\\[f_\\d+\\]/.test(document.querySelector('.article-editor')?.innerText || ''),
    tools: [...document.querySelectorAll('.art-block')].slice(0,3).map(b=>[...b.querySelectorAll('.art-tool')].map(t=>t.textContent.trim())),
    global: [...document.querySelectorAll('.art-global')].map(b=>b.textContent.trim()),
    undoDisabled: document.querySelector('.art-undo')?.disabled,
  })`));
  console.log('编辑器渲染:', JSON.stringify(base));
  // 点某段的“更口语”
  const t0 = Date.now();
  const clicked = await session.evaluate(`(() => { const block=[...document.querySelectorAll('.art-block')].find(b=>b.querySelector('.art-para')); const btn=[...block.querySelectorAll('.art-tool')].find(t=>t.textContent.includes('更口语')); btn.click(); return true; })()`);
  const cards = await waitFor(`document.querySelectorAll('.art-candidate:not(.is-loading)').length >= 2 ? document.querySelectorAll('.art-candidate:not(.is-loading)').length : 0`, 40);
  console.log(`候选: ${cards} 个｜${Math.round((Date.now()-t0)/1000)}s`);
  const beforeText = await session.evaluate(`document.querySelector('.art-para')?.textContent.slice(0,50)`);
  await session.evaluate(`document.querySelector('.art-candidate:not(.is-loading)')?.click()`);
  await sleep(400);
  const afterText = await session.evaluate(`document.querySelector('.art-para')?.textContent.slice(0,50)`);
  console.log('替换后变化:', beforeText !== afterText, '｜撤回可用:', await session.evaluate(`!document.querySelector('.art-undo')?.disabled`));
  await session.evaluate(`document.querySelector('.art-undo')?.click()`);
  await sleep(300);
  console.log('撤回恢复:', (await session.evaluate(`document.querySelector('.art-para')?.textContent.slice(0,50)`)) === beforeText);
  // 保存并重新核验
  const t1 = Date.now();
  await session.evaluate(`[...document.querySelectorAll('.article-editor-actions button')].find(b=>b.textContent.includes('保存并重新核验'))?.click()`);
  const notice = await waitFor(`(document.querySelector('.product-notice')?.textContent || '').includes('重新核验') ? document.querySelector('.product-notice').textContent : ''`, 90);
  console.log(`保存+核验 ${Math.round((Date.now()-t1)/1000)}s｜${notice}`);
  console.log('退出编辑:', await session.evaluate(`!document.querySelector('.article-editor')`));
} finally { close(); }
