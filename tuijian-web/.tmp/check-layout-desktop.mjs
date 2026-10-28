import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const ids = {
  wechat: 'b081e220-517b-4241-ac8e-0d5bb2861a71',
  xhs: '4c0c91ef-2809-4034-9b88-f10cba7ce63d',
};
try {
  for (const [name, id] of Object.entries(ids)) {
    const r = await measure(session, `http://localhost:5173/result/${id}`, {
      width: 1440, height: 1000, settle: 2600, ready: '#r-article',
      init: ["localStorage.setItem('tuijian_user','演示账号')"],
    });
    console.log(name, await session.evaluate(`JSON.stringify({
      article: (() => {
        const a = document.querySelector('#r-article .generated-article');
        if (!a) return null;
        const w = Math.round(a.getBoundingClientRect().width);
        const img = a.querySelector('figure img');
        const r = img?.getBoundingClientRect();
        return {width: w, imgW: r ? Math.round(r.width) : null, imgH: r ? Math.round(r.height) : null};
      })(),
      deckCards: document.querySelectorAll('.xhs-card').length,
      deckCols: getComputedStyle(document.querySelector('.xhs-deck') || document.body).gridTemplateColumns.split(' ').length,
      navShown: (() => { const n = document.querySelector('.xhs-nav'); return n ? getComputedStyle(n).display : 'none'; })(),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    })`));
    console.log('  errors:', JSON.stringify(r.errors));
    await shot(`.tmp/shots/result-${name}-desktop.png`);
  }
  // 手机：小红书用按钮翻页
  await measure(session, `http://localhost:5173/result/${ids.xhs}`, {width: 390, height: 844, settle: 2400, ready: '#r-article', init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log('手机小红书:', await session.evaluate(`JSON.stringify({
    cards: document.querySelectorAll('.xhs-card').length,
    visible: [...document.querySelectorAll('.xhs-card')].filter(c => getComputedStyle(c).display !== 'none').length,
    nav: (() => { const n = document.querySelector('.xhs-nav'); return n ? getComputedStyle(n).display : 'none'; })(),
    label: document.querySelector('.xhs-nav span')?.textContent,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  await shot('.tmp/shots/result-xhs-mobile-1.png');
  await session.evaluate(`document.querySelectorAll('.xhs-nav button')[1].click()`);
  await sleep(500);
  console.log('翻到下一张:', await session.evaluate(`JSON.stringify({
    visible: [...document.querySelectorAll('.xhs-card')].filter(c => getComputedStyle(c).display !== 'none').length,
    label: document.querySelector('.xhs-nav span')?.textContent,
    active: document.querySelector('.xhs-card.is-active')?.className,
  })`));
  await shot('.tmp/shots/result-xhs-mobile-2.png');
} finally {
  close();
}
