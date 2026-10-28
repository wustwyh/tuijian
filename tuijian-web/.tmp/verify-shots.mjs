// 校验 4 张正文截图的内容要素 + 预览弹窗与页面渲染是否一致（交接单 4 节、6.5 节）
import {openBrowser, measure} from './cdp.mjs';

const IDS = {
  'art-xhs.png':       '0bd571bb-da39-4bd6-8a02-2846b8c243df',
  'art-weibo-stu.png': 'a3a383e0-5dcf-4358-bbf1-1fc0dbd5f317',
  'art-weibo-mob.png': 'bc2bf0a7-691f-40bd-8ed8-1807cd98302c',
  'art-gzh.png':       'd7d5586a-4a6c-4d11-8a29-2f84d722e422',
};
const BASE = 'http://localhost:5173/result/';
const SECRET = /sk-[A-Za-z0-9]{8,}|api[_-]?key\s*[:=]|client[_-]?id\s*[:=]|authorization|bearer\s+[A-Za-z0-9]/i;
const {session, close} = await openBrowser();

const PICK = `(() => {
  const art = document.getElementById('r-article');
  const scene = document.getElementById('r-scene');
  const txt = art ? art.innerText : '';
  return JSON.stringify({
    identity: document.querySelector('.result-sticky-main')?.innerText.replace(/\\s+/g, ' ').trim(),
    statusChip: document.querySelector('.result-sticky-status')?.innerText || '',
    meta: document.querySelector('.result-meta-line')?.innerText || '',
    sceneOk: Boolean(scene && scene.innerText.length > 80),
    coreConflict: Boolean(scene && /需求|限制|矛盾|取舍/.test(scene.innerText)),
    sceneNo: document.querySelector('#r-scene .result-section-no, #r-scene [class*=no]')?.innerText || '',
    artNo: document.querySelector('#r-article .result-section-no, #r-article [class*=no]')?.innerText || '',
    articleText: txt,
    articleLen: txt.length,
    figures: art ? art.querySelectorAll('figure, .article-figure').length : 0,
    cards: art ? art.querySelectorAll('.xhs-card').length : 0,
    headings: art ? [...art.querySelectorAll('.article-heading')].map(h => h.innerText.trim()) : [],
    imgs: art ? art.querySelectorAll('img').length : 0,
    imgsLoaded: art ? [...art.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length : 0,
    previewBtn: [...document.querySelectorAll('#r-article button')].some(b => /预览发布稿/.test(b.textContent)),
    hasTags: Boolean(art && art.querySelector('.article-tags, [class*=tag]')),
  });
})()`;

const results = {};
try {
  for (const [file, id] of Object.entries(IDS)) {
    const api = await (await fetch(BASE.replace('/result/', '/api/generations/') + id)).json();
    const a = api.result.article;
    const r = await measure(session, BASE + id, {
      width: 1920, height: 1200, settle: 2500, ready: '#r-article',
      init: ["localStorage.setItem('tuijian_user','演示账号')"],
    });
    const p = JSON.parse(await session.evaluate(PICK));
    const t = p.articleText;
    const missing = [];
    if (!t.includes(a.title)) missing.push('标题');
    if (!t.includes(a.lead.slice(0, 24))) missing.push('导语');
    if (a.cta && !t.includes(a.cta.slice(0, 14))) missing.push('行动引导');
    const missTags = a.tags.filter((tag) => !t.includes(tag));
    if (missTags.length) missing.push('标签:' + missTags.join(','));
    if (!p.identity) missing.push('身份条');
    if (!p.sceneOk || !p.coreConflict) missing.push('01场景判断');
    results[file] = {
      id, platform: api.summary.platform, product: api.summary.product, audience: api.summary.audience,
      identity: p.identity, statusChip: p.statusChip, sectionNo: [p.sceneNo, p.artNo],
      articleLen: p.articleLen, figures: p.figures, cards: p.cards, imgs: `${p.imgsLoaded}/${p.imgs}`,
      headings: p.headings.length, previewBtn: p.previewBtn, missing,
      secretLeak: SECRET.test(t),
      errors: r.errors.slice(0, 3),
    };
    console.log(file.padEnd(18), JSON.stringify(results[file], null, 0).slice(0, 400));
  }

  // 6.5 对照：页面渲染 vs 弹窗导出稿
  const id = IDS['art-gzh.png'];
  await measure(session, BASE + id, {width: 1280, height: 1100, settle: 2000, ready: '#r-article',
    init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const pageSide = JSON.parse(await session.evaluate(`(() => {
    const art = document.getElementById('r-article');
    return JSON.stringify({
      headings: [...art.querySelectorAll('.article-heading')].map(h => h.innerText.trim()),
      head: art.innerText.replace(/\\s+/g,' ').slice(0, 160),
    });
  })()`));
  await session.evaluate("[...document.querySelectorAll('button')].find(b=>/预览发布稿/.test(b.textContent)).click()");
  let ok = false;
  for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 400));
    if (await session.evaluate("(()=>{const d=document.querySelector('iframe.pp-frame')?.contentDocument;return !!(d&&d.body&&d.body.innerText.length>500)})()")) { ok = true; break; } }
  await new Promise(r => setTimeout(r, 2000));
  const modalSide = JSON.parse(await session.evaluate(`(() => {
    const d = document.querySelector('iframe.pp-frame').contentDocument;
    return JSON.stringify({
      headings: [...d.querySelectorAll('h2,h3')].map(h => h.innerText.trim()),
      title: (d.querySelector('h1')?.innerText || '').trim(),
      head: d.body.innerText.replace(/\\s+/g,' ').slice(0, 160),
    });
  })()`));
  const sameHeadings = JSON.stringify(pageSide.headings) === JSON.stringify(modalSide.headings);
  console.log('\n=== 6.5 art-gzh.png vs art-gzh-preview.png ===');
  console.log('页面小标题:', JSON.stringify(pageSide.headings));
  console.log('弹窗小标题:', JSON.stringify(modalSide.headings));
  console.log('小标题顺序一致:', sameHeadings);
  console.log('页面开头:', pageSide.head.slice(0, 80));
  console.log('弹窗开头:', modalSide.head.slice(0, 80));
  console.log('iframe ready:', ok);
} finally {
  close();
}
