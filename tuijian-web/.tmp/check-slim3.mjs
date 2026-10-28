import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const go = async (path, width, height, ready) => {
  const r = await measure(session, `http://localhost:5173${path}`, {
    width, height, settle: 2000, ready, init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  if (r.errors?.length) console.log(path, width, '错误:', JSON.stringify(r.errors));
  return r;
};
try {
  await go('/create/platform', 1440, 1150, '.pf-preview');
  console.log('平台页:', await session.evaluate(`JSON.stringify({
    cards: document.querySelectorAll('.pf').length,
    previewH: Math.round(document.querySelector('.pf-preview').getBoundingClientRect().height),
    cardH: Math.round(document.querySelector('.pf').getBoundingClientRect().height),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  await shot('.tmp/shots/platforms-preview.png');
  await go('/create/platform', 390, 900, '.pf-preview');
  console.log('平台页手机:', await session.evaluate(`JSON.stringify({
    previewH: Math.round(document.querySelector('.pf-preview').getBoundingClientRect().height),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  await shot('.tmp/shots/platforms-preview-mobile.png');

  await go('/history', 390, 900, '.history-scope');
  console.log('历史手机:', await session.evaluate(`JSON.stringify({
    selects: document.querySelectorAll('.history-select select').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  await shot('.tmp/shots/history-mobile.png');

  // 三种版式的结果页
  for (const [name, id] of [['wechat', 'b081e220-517b-4241-ac8e-0d5bb2861a71'], ['xhs', '4c0c91ef-2809-4034-9b88-f10cba7ce63d'], ['tieba', '16ae9440-f38d-450d-8c37-81d6bfc1e46d']]) {
    await go(`/result/${id}`, 1440, 1000, '.rs-top');
    console.log(name, await session.evaluate(`JSON.stringify({
      hero: !!document.querySelector('.rs-hero'),
      article: !!document.querySelector('#r-article .generated-article, #r-article .article-card, #r-article .article-flow'),
      kindClass: (document.querySelector('#r-article .rs-card, #r-article')?.innerHTML || '').slice(0, 0) || '',
      folds: document.querySelectorAll('.rs-fold').length,
      buttons: document.querySelectorAll('.result-page button').length,
      docH: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    })`));
    await shot(`.tmp/shots/result-slim-${name}.png`);
  }
} finally {
  close();
}
