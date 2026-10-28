import {readFileSync, writeFileSync} from 'node:fs';
import {LAYOUT_SPECS} from '../src/layout-specs.js';

const file = 'src/publish-html.js';
const src = readFileSync(file, 'utf8');
const start = src.indexOf('// 每种版式：容器宽度、排版基调、结构顺序都不同。');
const endMarker = 'export function buildPublishHtml';
const end = src.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error('找不到 LAYOUTS 区域');

const S = LAYOUT_SPECS;
const figCss = (spec, align) => `figure{margin:20px 0;display:flex;flex-direction:column;gap:8px}
figure img{display:block;margin:0 auto;width:auto;max-width:min(100%,${spec.imgMax}px);max-height:${spec.imgMaxH}px;height:auto;object-fit:contain;border-radius:${spec.radius}px;background:#f7f4f6}
figcaption{font-size:12.5px;color:#8b7d84;line-height:1.7;text-align:${align}}`;

const layouts = `// 每种版式：容器宽度、排版基调、结构顺序都不同；数字与 src/layout-specs.js 保持一致。
const LAYOUTS = {
  // 公众号长图文：620 栏、导语、分段正文、居中图注，配图限高不放大
  article: {
    css: \`body{max-width:${S.article.width}px;margin:0 auto;padding:28px 24px;\${FONT}color:#23262c;font-size:${S.article.body}px;line-height:1.9}
h1{font-size:${S.article.title}px;line-height:1.45;margin:0 0 14px}
p.lead{color:#576b95;background:#f6f7f9;padding:12px 14px;border-radius:6px;margin:0 0 18px}
h3{font-size:18px;line-height:1.5;margin:24px 0 10px;color:#1b2330}
\${figCss(S.article, 'center')}
p.cta{margin-top:24px;font-weight:600;color:#1f2d3d}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.tags span{color:#576b95;font-size:13px}\`,
    body: (a, f) => \`<h1>\${esc(plain(a.title))}</h1>
\${a.lead ? \`<p class="lead">\${esc(plain(a.lead))}</p>\` : ''}
<div class="flow">\${flowHtml(a, f, 'center')}</div>
\${a.cta ? \`<p class="cta">\${esc(plain(a.cta))}</p>\` : ''}
\${tagPills(a.tags, 'tags')}\`,
  },

  // 新闻稿：报头式，衬线字体、图片比正文窄、图注带引线
  news: {
    css: \`body{max-width:${S.news.width}px;margin:0 auto;padding:30px 26px;font-family:Georgia,"Songti SC","SimSun",serif;color:#111;font-size:${S.news.body}px;line-height:1.9}
.dateline{font-size:12px;letter-spacing:.08em;color:#8a6d3b;border-bottom:2px solid #8a6d3b;padding-bottom:8px}
h1{font-size:${S.news.title}px;margin:18px 0 14px;text-align:left;line-height:1.4}p.lead{font-weight:600;color:#333}
h3{font-size:17px;line-height:1.5;margin:24px 0 8px;color:#1a1a1a}
\${figCss(S.news, 'left')}
figure{margin-left:0}
p.cta{margin-top:20px;font-size:14px;color:#555}\`,
    body: (a, f, dateStr) => \`<p class="dateline">\${esc(dateStr)}　产品资讯</p>
<h1>\${esc(plain(a.title))}</h1>
\${a.lead ? \`<p class="lead">\${esc(plain(a.lead))}</p>\` : ''}
<div class="flow">\${flowHtml(a, f, 'left')}</div>
\${a.cta ? \`<p class="cta">\${esc(plain(a.cta))}</p>\` : ''}\`,
  },

  // 知乎：问答式，问题作标题，蓝色引用带
  qa: {
    css: \`body{max-width:${S.qa.width}px;margin:0 auto;padding:26px 24px;\${FONT}color:#1a1a1a;font-size:${S.qa.body}px;line-height:1.85}
h1.q{font-size:${S.qa.title}px;font-weight:700;border-left:4px solid #0084ff;padding-left:12px;line-height:1.45}
p.lead{color:#556;background:#f3f8ff;border-radius:8px;padding:10px 14px}p{text-align:justify}
h3{font-size:18px;line-height:1.5;margin:26px 0 8px;border-left:3px solid #0084ff;padding-left:10px;color:#13283f}
\${figCss(S.qa, 'center')}
p.cta{margin-top:22px;padding:12px 14px;background:#f3f8ff;border-radius:6px}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.tags span{color:#0084ff;font-size:13px}\`,
    body: (a, f) => \`<h1 class="q">\${esc(plain(a.title))}</h1>
\${a.lead ? \`<p class="lead">\${esc(plain(a.lead))}</p>\` : ''}
<div class="flow">\${flowHtml(a, f, 'center')}</div>
\${a.cta ? \`<p class="cta">\${esc(plain(a.cta))}</p>\` : ''}
\${tagPills(a.tags, 'tags')}\`,
  },

  // 小红书：桌面三列卡片墙，窄屏单卡 + 左右按钮翻页（不靠滑动）
  card: {
    css: \`body{margin:0;padding:0 0 22px;\${FONT}color:#2b2b2b;background:#f4f4f6}
.hint{padding:14px 16px 8px;font-size:12px;color:#9a9a9a;text-align:center;letter-spacing:.03em}
.deck{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:4px 20px 8px}
.card{width:100%;aspect-ratio:340/453;border-radius:16px;overflow:hidden;position:relative;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.08);display:flex;flex-direction:column}
.card .idx{position:absolute;right:10px;bottom:8px;font-size:11px;color:rgba(0,0,0,.3);z-index:3}
.card.cover .cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.card.cover .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(0,0,0,.78))}
.card.cover .cover-text{position:relative;margin-top:auto;padding:18px;color:#fff;font-size:20px;font-weight:800;line-height:1.34;z-index:2}
.card.cover.noimg{background:linear-gradient(150deg,#ffe8ef,#ffe0e8 45%,#f7d9ff)}
.card.cover.noimg .cover-text{color:#2b2b2b;margin:auto 0;padding:24px}
.card.media .shot{width:100%;flex:1;min-height:0;object-fit:cover;display:block;background:#fafafa}
.card.media .cap{padding:9px 13px;font-size:12px;color:#8a8a8a;line-height:1.55}
.card.text .body{padding:24px 20px;font-size:15px;line-height:1.9;overflow:hidden}
.card.text .body p{margin:0 0 10px}
.card.text .body p:last-child{margin-bottom:0}
.card.end{background:linear-gradient(155deg,#fff6f8,#ffeaf0);justify-content:center;gap:14px;padding:24px 20px}
.card.end .cta{font-size:15.5px;font-weight:700;line-height:1.7;color:#a3244b}
.card.end .pills{display:flex;flex-wrap:wrap;gap:7px}
.card.end .pills span{background:#fff;color:#c2185b;font-size:12.5px;padding:4px 10px;border-radius:999px}
.src{max-width:620px;margin:14px auto 0;padding:0 16px;font-size:11px;color:#9a9a9a;line-height:1.7}
.nav{display:none}
@media (max-width:1000px){
.deck{display:block;padding:4px 16px 0}
.deck-js .card{display:none}
.deck-js .card.is-active{display:flex}
.nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px}
.nav button{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid #e6dde3;background:#fff;color:#7b6d74;font-size:18px;line-height:1;cursor:pointer}
.nav-idx{font-size:12px;color:#8b7d84;min-width:52px;text-align:center}
}\`,
    body: (a, f) => {
      const imgs = f || [];
      const { cards: plan, sources } = planXhsDeck(a);
      const cards = plan.map((card) => {
        if (card.type === 'cover') {
          const first = card.imageIndex >= 0 ? imgs[card.imageIndex] : null;
          return first
            ? { cls: 'card cover', html: \`<img class="cover-img" src="\${dataSrc(first)}" alt=""><div class="shade"></div><div class="cover-text">\${esc(plain(a.title))}</div>\` }
            : { cls: 'card cover noimg', html: \`<div class="cover-text">\${esc(plain(a.title))}</div>\` };
        }
        if (card.type === 'image') {
          const item = imgs[card.imageIndex];
          return { cls: 'card media', html: \`<img class="shot" src="\${dataSrc(item)}" alt=""><div class="cap">\${esc(plain(item.img.caption || ''))}</div>\` };
        }
        if (card.type === 'text') {
          return { cls: 'card text', html: \`<div class="body">\${card.text.split('\\n').map(t => \`<p>\${esc(plain(t))}</p>\`).join('')}</div>\` };
        }
        const tags = (a.tags || []).map(t => \`<span>#\${esc(plain(t).replace(/^#+/, ''))}</span>\`).join('');
        return { cls: 'card end', html: \`\${a.cta ? \`<div class="cta">\${esc(plain(a.cta))}</div>\` : ''}\${tags ? \`<div class="pills">\${tags}</div>\` : ''}\` };
      });
      const total = cards.length;
      const html = cards.map((c, i) => \`<section class="\${c.cls}">\${c.html}<span class="idx">\${i + 1}/\${total}</span></section>\`).join('\\n');
      const src = sources.length
        ? \`<div class="src"><b>事实来源（内部对照，不计入发布正文）</b><br>\${sources.map((s) => esc(plain(s))).join('<br>')}</div>\`
        : '';
      // 手机端翻页：不靠滑动，用左右按钮；没脚本时退化成竖排全部可见，内容不丢。
      const nav = \`<div class="nav"><button type="button" data-step="-1" aria-label="上一张">‹</button><span class="nav-idx">1 / \${total}</span><button type="button" data-step="1" aria-label="下一张">›</button></div>
<script>(function(){document.body.classList.add('deck-js');var cards=[].slice.call(document.querySelectorAll('.deck > .card'));var out=document.querySelector('.nav-idx');var at=0;function show(n){at=Math.max(0,Math.min(cards.length-1,n));cards.forEach(function(c,k){c.classList.toggle('is-active',k===at)});if(out)out.textContent=(at+1)+' / '+cards.length;}[].forEach.call(document.querySelectorAll('.nav button'),function(btn){btn.addEventListener('click',function(){show(at+Number(btn.getAttribute('data-step')))})});show(0);})();<\\/script>\`;
      return \`<div class="hint">\${total} 张卡片 · 桌面上三列平铺，手机上用左右按钮翻</div>\\n<div class="deck">\\n\${html}\\n</div>\\n\${nav}\\n\${src}\`;
    },
  },

  // 微博：短文案流，标签前置，配图走九宫格小图
  feed: {
    css: \`body{max-width:\${S.feed.width}px;margin:0 auto;padding:22px;\${FONT}color:#222;font-size:\${S.feed.body}px;line-height:1.8;background:#fafafa}
.pills-top{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.pills-top span{color:#eb7350;font-size:14px}
p.flow{font-size:15px;margin:0 0 8px}
figure{display:inline-flex;width:calc(33.33% - 6px);margin:3px;vertical-align:top}
figure img{width:100%;height:110px;object-fit:cover;border-radius:6px;display:block}
figcaption{display:none}
p.cta{margin-top:12px;color:#eb7350;font-weight:600}\`,
    body: (a, f) => \`\${tagPills(a.tags, 'pills-top')}
\${a.lead ? \`<p class="flow">\${esc(plain(a.lead))}</p>\` : ''}
\${paras(a.body, 'flow')}
<div class="figs">\${figures(f, 'flow')}</div>
\${a.cta ? \`<p class="cta">\${esc(plain(a.cta))}</p>\` : ''}\`,
  },

  // 门店海报：单页海报，固定画幅一屏看完，主视觉就该大
  poster: {
    css: \`body{margin:0;padding:24px 0;\${FONT}background:#e8e9ec;color:#111}
.page{width:620px;height:820px;margin:0 auto;background:#fff;box-shadow:0 12px 34px rgba(0,0,0,.16);display:flex;flex-direction:column;overflow:hidden}
.page .shot{width:100%;height:318px;object-fit:cover;display:block;flex:0 0 auto}
.page .cap{font-size:11px;color:#999;padding:6px 32px 0}
.headline{padding:18px 32px 4px;font-weight:800;line-height:1.14;letter-spacing:.02em}
.sub{padding:0 32px;font-size:16px;color:#555;line-height:1.55;max-height:50px;overflow:hidden}
ul.points{margin:0;padding:14px 32px 0 52px;font-size:17px;line-height:1.85}
ul.points li{font-weight:600;margin-bottom:2px}
.foot{margin-top:auto;padding:16px 32px 24px;font-size:14px;font-weight:700;color:#8a2b2b;border-top:1px solid #f0eeee;line-height:1.55;max-height:86px;overflow:hidden}\`,
    body: (a, f) => {
      const first = (f || [])[0];
      const rawTitle = plain(a.title);
      const titleSize = rawTitle.length > 20 ? 26 : rawTitle.length > 14 ? 32 : 42;
      const points = posterPoints(a.body, 3, 16);
      return \`<div class="page">
\${first ? \`<img class="shot" src="\${dataSrc(first)}" alt=""><div class="cap">\${esc(plain(first.img.caption || ''))}</div>\` : ''}
<div class="headline" style="font-size:\${titleSize}px">\${esc(rawTitle)}</div>
\${a.lead ? \`<div class="sub">\${esc(clampText(a.lead, 46))}</div>\` : ''}
\${points.length ? \`<ul class="points">\${points.map((p) => \`<li>\${esc(p)}</li>\`).join('')}</ul>\` : ''}
\${a.cta ? \`<div class="foot">\${esc(clampText(a.cta, 60))}</div>\` : ''}
</div>\`;
    },
  },

  // 销售朋友圈：桌面上就是一张 380 宽的手机卡，配图小网格
  moment: {
    css: \`body{margin:0;padding:22px 14px;\${FONT}background:#ededed;color:#191919}
.post{width:\${S.moment.width}px;max-width:100%;margin:0 auto;background:#fff;border-radius:8px;padding:14px 14px 12px}
.text{display:block;font-size:15px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
details.more{display:flex;flex-direction:column;margin:0}
details.more summary{order:2;list-style:none;cursor:pointer}
details.more summary::-webkit-details-marker{display:none}
details.more .full{order:1;margin:0 0 8px;font-size:15px;line-height:1.7;white-space:pre-wrap;word-break:break-word;color:#191919}
.lbl-open{display:block;margin-top:6px;font-size:14px;color:#576b95}
.lbl-close{display:none;margin-top:8px;font-size:14px;color:#576b95}
details.more[open] .text{display:none}
details.more[open] .lbl-open{display:none}
details.more[open] .lbl-close{display:block}
.grid{display:grid;gap:4px;margin-top:10px}
.grid.n1{grid-template-columns:1fr}.grid.n1 img{aspect-ratio:4/3}
.grid.n2{grid-template-columns:1fr 1fr}
.grid.n3{grid-template-columns:repeat(3,1fr)}
.grid.n4{grid-template-columns:1fr 1fr}
.grid img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;border-radius:3px;background:#f2f2f2}
.clip{max-width:380px;margin:10px auto 0;font-size:11px;color:#9a9a9a;text-align:center;line-height:1.7}\`,
    body: (a, f) => {
      const { shown, full, expanded, length } = momentText(a, 150);
      const imgs = (f || []).slice(0, 9);
      const count = imgs.length;
      const gridClass = count === 1 ? 'n1' : count === 2 ? 'n2' : count === 3 ? 'n3' : 'n4';
      const grid = count
        ? \`<div class="grid \${gridClass}">\${imgs.map((item) => \`<img src="\${dataSrc(item)}" alt="">\`).join('')}</div>\`
        : '';
      const textBlock = \`<span class="text">\${esc(shown)}</span>\`;
      const more = expanded
        ? \`<details class="more"><summary>\${textBlock}<span class="lbl-open">展开全文（共 \${length} 字）</span><span class="lbl-close">收起</span></summary><div class="full">\${esc(full)}</div></details>\`
        : textBlock;
      const notes = [];
      if (count) notes.push(\`配图 \${count} 张 · 取自知识库原图\`);
      return \`<div class="post">
\${more}
\${grid}
</div>
\${notes.length ? \`<div class="clip">\${esc(notes.join('；'))}</div>\` : ''}\`;
    },
  },

  // 企业采购方案：文档式，分节编号，图小、带框
  doc: {
    css: \`body{max-width:\${S.doc.width}px;margin:0 auto;padding:32px 28px;\${FONT}color:#1a1a1a;font-size:\${S.doc.body}px;line-height:1.85}
h1{font-size:\${S.doc.title}px;border-bottom:2px solid #1a1a1a;padding-bottom:10px;line-height:1.4}
.abstract{background:#f4f6f8;padding:14px 16px;border-radius:6px;font-size:14px;color:#444}
h2{font-size:16px;margin:22px 0 8px;color:#0b4f8a}
h3{font-size:15px;margin:18px 0 6px;color:#0b4f8a}
\${figCss(S.doc, 'center')}
figure{margin:16px 0}figure img{border:1px solid #e3e6ea}
p.cta{margin-top:24px;padding:14px 16px;border:1px dashed #0b4f8a;border-radius:6px;font-weight:600}\`,
    body: (a, f) => \`<h1>\${esc(plain(a.title))}</h1>
\${a.lead ? \`<div class="abstract">\${esc(plain(a.lead))}</div>\` : ''}
<h2>需求与适用条件</h2>
<div class="flow">\${flowHtml(a, f, 'center')}</div>
\${a.cta ? \`<p class="cta">\${esc(plain(a.cta))}</p>\` : ''}\`,
  },
};

`;

const next = src.slice(0, start) + layouts + src.slice(end);
writeFileSync(file, next);
console.log('LAYOUTS 已重写，长度', next.length);
