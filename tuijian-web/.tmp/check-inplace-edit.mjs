import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 40) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
const id = "b081e220-517b-4241-ac8e-0d5bb2861a71";
try {
  const r = await measure(session, `http://localhost:5173/result/${id}`, {width: 1440, height: 1000, settle: 2200, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log('errors:', JSON.stringify(r.errors));
  // 打开预览弹窗，检查 tab 与设备切换
  await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('预览发布稿'))?.click()`);
  await sleep(2500);
  console.log('弹窗:', await session.evaluate(`JSON.stringify({
    tabs: [...document.querySelectorAll('.pp-tabs button')].map(b=>b.textContent.trim()),
    device: [...document.querySelectorAll('.pp-device button')].map(b=>b.textContent.trim()),
    frameW: Math.round(document.querySelector('.pp-frame')?.getBoundingClientRect().width || 0),
  })`));
  // 切手机
  await session.evaluate(`[...document.querySelectorAll('.pp-device button')].find(b=>b.textContent.includes('手机'))?.click()`);
  await sleep(800);
  console.log('手机预览宽度:', await session.evaluate(`Math.round(document.querySelector('.pp-frame')?.getBoundingClientRect().width || 0)`));
  // 切改稿
  await session.evaluate(`[...document.querySelectorAll('.pp-tabs button')].find(b=>b.textContent.includes('改稿'))?.click()`);
  await sleep(1200);
  console.log('改稿态:', await session.evaluate(`JSON.stringify({
    hitBlocks: document.querySelectorAll('.edit-hit').length,
    editable: !!document.querySelector('.inline-edit'),
    stageW: Math.round(document.querySelector('.inline-edit')?.getBoundingClientRect().width || 0),
  })`));
  // 点第一段
  const clicked = await session.evaluate(`(() => { const b=[...document.querySelectorAll('.edit-hit')].find(x=>x.dataset.kind==='para'); if(!b) return 'none'; b.click(); return b.textContent.slice(0,24); })()`);
  console.log('点段落:', clicked);
  const chips = await waitFor(`document.querySelectorAll('.ai-chip').length >= 3 ? [...document.querySelectorAll('.ai-chip')].map(b=>b.textContent.trim()).join('｜') : 0`, 40);
  console.log('关键词:', chips);
  const t0 = Date.now();
  await session.evaluate(`document.querySelectorAll('.ai-chip')[0].click()`);
  const req = await waitFor(`document.querySelector('.ai-requirement p')?.textContent || ''`, 45);
  console.log(`AI需求 ${Math.round((Date.now()-t0)/1000)}s:`, req);
  console.log('改后段落:', await session.evaluate(`(() => { const b=[...document.querySelectorAll('.edit-hit.is-selected')][0]; return b ? b.textContent.slice(0,40) : 'none'; })()`));
} finally { close(); }
