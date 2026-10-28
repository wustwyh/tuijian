import {openBrowser, measure} from './cdp.mjs';
import {readFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const id = readFileSync('.tmp/last-gen-id.txt', 'utf8').trim();
try {
  const r = await measure(session, 'http://localhost:5173/result/' + id, {
    width: 1440, height: 950, settle: 1500, ready: '.result-page',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  const t0 = Date.now();
  let opened = false;
  let statusText = '';
  for (let i = 0; i < 150; i++) {
    opened = await session.evaluate("!!document.querySelector('.wb')");
    statusText = await session.evaluate("document.querySelector('.result-badge')?.textContent || ''");
    if (opened) break;
    await sleep(1000);
  }
  console.log('自动打开工作台:', opened, '｜用时', Math.round((Date.now() - t0) / 1000) + 's', '｜状态徽标:', statusText);
  if (opened) {
    console.log('工作台:', await session.evaluate("JSON.stringify({tabs:[...document.querySelectorAll('.wb-tabs button')].map(b=>b.textContent.trim()), frame: !!document.querySelector('.wb-frame iframe'), save: document.querySelector('.wb-save')?.textContent.trim()})"));
  }
  console.log('errors:', JSON.stringify(r.errors));
} finally { close(); }
