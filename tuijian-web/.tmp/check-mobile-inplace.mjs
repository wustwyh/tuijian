import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 45) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
const id = "16ae9440-f38d-450d-8c37-81d6bfc1e46d";
try {
  // 1) 390 手机：预览弹窗 + 改稿
  const r = await measure(session, `http://localhost:5173/result/${id}`, {width: 390, height: 844, settle: 2200, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('预览发布稿'))?.click()`);
  await sleep(2200);
  await session.evaluate(`[...document.querySelectorAll('.pp-device button')].find(b=>b.textContent.includes('手机'))?.click()`);
  await sleep(600);
  const mobile = await session.evaluate(`JSON.stringify({
    modalW: Math.round(document.querySelector('.pp-dialog')?.getBoundingClientRect().width||0),
    frameW: Math.round(document.querySelector('.pp-frame')?.getBoundingClientRect().width||0),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`);
  console.log('手机预览@390:', mobile);
  await session.evaluate(`[...document.querySelectorAll('.pp-tabs button')].find(b=>b.textContent.includes('改稿'))?.click()`);
  await sleep(1200);
  const panelBefore = await session.evaluate(`JSON.stringify({hits: document.querySelectorAll('.edit-hit').length, w: Math.round(document.querySelector('.inline-edit')?.getBoundingClientRect().width||0)})`);
  console.log('手机改稿:', panelBefore);
  await session.evaluate(`[...document.querySelectorAll('.edit-hit')].find(x=>x.dataset.kind==='para')?.click()`);
  await waitFor(`document.querySelectorAll('.ai-chip').length >= 3`, 40);
  console.log('手机面板:', await session.evaluate(`JSON.stringify({
    bottomSheet: (()=>{const p=document.querySelector('.ai-panel');if(!p)return false;const s=getComputedStyle(p);return s.position==='fixed'&&parseInt(s.bottom)===0})(),
    chips: document.querySelectorAll('.ai-chip').length,
    panelW: Math.round(document.querySelector('.ai-panel')?.getBoundingClientRect().width||0),
  })`));
  console.log('errors:', JSON.stringify(r.errors));
  // 2) 1440：03 页内改稿仍然可用
  await measure(session, `http://localhost:5173/result/${id}`, {width: 1440, height: 1000, settle: 1800, ready: "#r-article"});
  await session.evaluate(`[...document.querySelectorAll('#r-article button')].find(b=>b.textContent.trim()==='改稿')?.click()`);
  await sleep(900);
  console.log('页内改稿:', await session.evaluate(`JSON.stringify({editor: !!document.querySelector('#r-article .inline-edit'), hits: document.querySelectorAll('#r-article .edit-hit').length})`));
} finally { close(); }
