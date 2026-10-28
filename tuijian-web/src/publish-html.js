// 按平台生成自包含 HTML 发布稿。
// 不同平台不是换字号，而是版式结构不同：顺序、标题形态、图注对齐、标签位置、是否分栏。
import {inlinePlainText, parseHeading} from './publication.js';
import {planXhsDeck} from './card-deck.js';
import {buildArticleFlow} from './article-flow.js';
import {CHROME_CSS} from './chrome-css.js';
import {chromeTopHtml, chromeBottomHtml, chromeInfo} from './platform-chrome.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 发布视图：去 [f_n]、**、反引号，再去掉段首的 markdown 井号（标题由 paraHtml 单独渲染）。
const plain = (s) => inlinePlainText(s).trim().replace(/^(?:#{1,6}\s+)+/, '').trim();

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return btoa(bin);
}

// 正文段落：成稿用「## 一、…」分节时渲染成小标题，井号不能出现在读者眼前；
// 清洗后为空（例如整段只有 `![主视觉](image_id:…)`）就直接丢掉，不留空行。
const paraHtml = (raw) => {
  const heading = parseHeading(inlinePlainText(raw));
  if (heading) return `<h3>${esc(heading)}</h3>`;
  const text = plain(raw);
  return text ? `<p>${esc(text)}</p>` : '';
};

const paras = (text, cls = '') => String(text || '').split(/\n+/).map(t => t.trim()).filter(Boolean)
  .map(t => {
    const html = paraHtml(t);
    return cls && html.startsWith('<p>') ? html.replace('<p>', `<p class="${cls}">`) : html;
  }).filter(Boolean).join('\n');

const bullets = (text, max) => String(text || '').split(/\n+/).map(t => t.trim()).filter(Boolean)
  .slice(0, max).map(t => `<li>${esc(plain(t))}</li>`).join('');

const dataSrc = (item) => `data:${item.mime};base64,${toBase64(item.bytes)}`;

const clampText = (value, max) => {
  const text = plain(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

// 海报卖点：从正文提炼短句。宁可少一条，也不要「会议演示时」这种没信息量的碎片，
// 也不要「HUAWEI MateBook Pro …」这种以型号打头被硬截的短语。
const CJK = /[\u4e00-\u9fa5]/;
function posterPoints(body, max = 3, limit = 16) {
  const sentences = String(body || '')
    .replace(/^#{1,6}\s+/gm, '')   // markdown 分节符不进卖点
    .split(/[\n。！？!?；;]+/).map((t) => t.trim()).filter(Boolean);
  const out = [];
  for (const sentence of sentences) {
    const clauses = sentence.split(/[，,]/).map((c) => c.trim()).filter(Boolean);
    // 只取「中文开头 + 至少 8 字」的完整小句：宁可跳过这句，也不要截出
    // 「会议演示时」这种碎片，或「14.2英寸3:2柔性OLE…」这种被切断的规格串。
    const fitting = clauses.find((c) => CJK.test(c[0]) && c.length >= 8 && c.length <= limit);
    const usable = fitting || clauses.find((c) => CJK.test(c[0]) && c.length >= 8);
    if (!usable) continue;
    const cleaned = usable.replace(/[。！？；;]$/, '').trim();
    out.push(cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned);
    if (out.length >= max) break;
  }
  return out;
}

// 朋友圈文案：微信客户端会在 6 行左右折叠，这里给一个宽松阈值（300 字），
// 只有真正很长的文案才折叠，剩余全文放进「展开全文」，点了能看全，不丢内容。
function momentText(article, limit = 300) {
  const body = [article?.lead, article?.body].filter(Boolean).map((t) => plain(t)).join('\n');
  const cta = article?.cta ? plain(article.cta) : '';
  const full = [body, cta].filter(Boolean).join('\n');
  const cut = full.length > limit;
  // 折叠时只在末尾放一个省略号，省略号后面不许再有半个字的尾巴。
  const shown = cut
    ? `${full.slice(0, limit - 1).replace(/[\s，、；：,.;:]+$/, '')}…`
    : full;
  return {
    shown,
    full,
    expanded: cut,
    trimmed: cut,
    length: full.length,
  };
}

// 图文穿插：按 buildArticleFlow 的顺序输出段落与图片，图跟着对应段落走，不堆到文末。
function flowHtml(article, loaded, align) {
  return buildArticleFlow(article).map((block) => {
    if (block.type === 'para') return paraHtml(block.text);
    const item = (loaded || [])[block.imageIndex];
    if (!item) return '';
    const position = item.img.position ? ` · ${esc(plain(item.img.position))}` : '';
    return `<figure class="fig-${align}"><img src="${dataSrc(item)}" alt=""><figcaption>${esc(plain(item.img.caption || ''))}${position}</figcaption></figure>`;
  }).join('\n');
}

function figures(loaded, align = 'center') {
  return loaded.map(({ img, bytes, mime }) =>
    `<figure class="fig-${align}"><img src="data:${mime};base64,${toBase64(bytes)}" alt="">` +
    `<figcaption>${esc(plain(img.caption || ''))}${img.position ? ` · ${esc(plain(img.position))}` : ''}</figcaption></figure>`
  ).join('\n');
}

const tagPills = (tags, cls) => (tags || []).length
  ? `<div class="${cls}">${tags.map(t => `<span>#${esc(plain(t).replace(/^#+/, ''))}</span>`).join('')}</div>`
  : '';

// 这里必须是合法 CSS：以前写成裸声明 box-sizing:border-box; 时，浏览器会把紧跟其后的
// 第一条规则（各版式的 body{max-width…}）整块丢掉，结果所有平台都变成通栏大图。
const BASE = '*{box-sizing:border-box}';

const FONT = 'font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;';

// 每种版式：容器宽度、排版基调、结构顺序都不同；数字与 src/layout-specs.js 保持一致。
const LAYOUTS = {
  // 公众号长图文：620 栏、导语、分段正文、居中图注，配图限高不放大
  article: {
    css: `body{max-width:620px;margin:0 auto;padding:28px 24px;${FONT}color:#23262c;font-size:15.5px;line-height:1.9}
h1{font-size:22px;line-height:1.45;margin:0 0 14px}
p.lead{color:#576b95;background:#f6f7f9;padding:12px 14px;border-radius:6px;margin:0 0 18px}
h3{font-size:18px;line-height:1.5;margin:24px 0 10px;color:#1b2330}
figure{margin:20px 0;display:flex;flex-direction:column;gap:8px}
figure img{display:block;margin:0 auto;width:auto;max-width:min(100%,560px);max-height:360px;height:auto;object-fit:contain;border-radius:8px;background:#f7f4f6}
figcaption{font-size:12.5px;color:#8b7d84;line-height:1.7;text-align:center}
p.cta{margin-top:24px;font-weight:600;color:#1f2d3d}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.tags span{color:#576b95;font-size:13px}`,
    body: (a, f) => `<h1>${esc(plain(a.title))}</h1>
${a.lead ? `<p class="lead">${esc(plain(a.lead))}</p>` : ''}
<div class="flow">${flowHtml(a, f, 'center')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}
${tagPills(a.tags, 'tags')}`,
  },

  // 新闻稿：报头式，衬线字体、图片比正文窄、图注带引线
  news: {
    css: `body{max-width:700px;margin:0 auto;padding:30px 26px;font-family:Georgia,"Songti SC","SimSun",serif;color:#111;font-size:15.5px;line-height:1.9}
.dateline{font-size:12px;letter-spacing:.08em;color:#8a6d3b;border-bottom:2px solid #8a6d3b;padding-bottom:8px}
h1{font-size:26px;margin:18px 0 14px;text-align:left;line-height:1.4}p.lead{font-weight:600;color:#333}
h3{font-size:17px;line-height:1.5;margin:24px 0 8px;color:#1a1a1a}
figure{margin:20px 0;display:flex;flex-direction:column;gap:8px}
figure img{display:block;margin:0 auto;width:auto;max-width:min(100%,440px);max-height:300px;height:auto;object-fit:contain;border-radius:2px;background:#f7f4f6}
figcaption{font-size:12.5px;color:#8b7d84;line-height:1.7;text-align:left}
figure{margin-left:0}
p.cta{margin-top:20px;font-size:14px;color:#555}`,
    body: (a, f, dateStr) => `<p class="dateline">${esc(dateStr)}　产品资讯</p>
<h1>${esc(plain(a.title))}</h1>
${a.lead ? `<p class="lead">${esc(plain(a.lead))}</p>` : ''}
<div class="flow">${flowHtml(a, f, 'left')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}`,
  },

  // 知乎：问答式，问题作标题，蓝色引用带
  qa: {
    css: `body{max-width:680px;margin:0 auto;padding:26px 24px;${FONT}color:#1a1a1a;font-size:15.5px;line-height:1.85}
h1.q{font-size:22px;font-weight:700;border-left:4px solid #0084ff;padding-left:12px;line-height:1.45}
p.lead{color:#556;background:#f3f8ff;border-radius:8px;padding:10px 14px}p{text-align:justify}
h3{font-size:18px;line-height:1.5;margin:26px 0 8px;border-left:3px solid #0084ff;padding-left:10px;color:#13283f}
figure{margin:20px 0;display:flex;flex-direction:column;gap:8px}
figure img{display:block;margin:0 auto;width:auto;max-width:min(100%,520px);max-height:340px;height:auto;object-fit:contain;border-radius:6px;background:#f7f4f6}
figcaption{font-size:12.5px;color:#8b7d84;line-height:1.7;text-align:center}
p.cta{margin-top:22px;padding:12px 14px;background:#f3f8ff;border-radius:6px}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.tags span{color:#0084ff;font-size:13px}`,
    body: (a, f) => `<h1 class="q">${esc(plain(a.title))}</h1>
${a.lead ? `<p class="lead">${esc(plain(a.lead))}</p>` : ''}
<div class="flow">${flowHtml(a, f, 'center')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}
${tagPills(a.tags, 'tags')}`,
  },

  // 小红书：桌面三列卡片墙，窄屏单卡 + 左右按钮翻页（不靠滑动）
  card: {
    css: `body{margin:0;padding:0 0 22px;${FONT}color:#2b2b2b;background:#f4f4f6}
.hint{padding:14px 16px 8px;font-size:12px;color:#9a9a9a;text-align:center;letter-spacing:.03em}
.deck{position:relative;display:block;max-width:360px;margin:0 auto;padding:4px 0 0}
.card{display:none;width:100%;aspect-ratio:340/453;border-radius:16px;overflow:hidden;position:relative;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.08);flex-direction:column}
.card.is-active{display:flex;box-shadow:0 10px 26px rgba(0,0,0,.12)}
.nav{position:absolute;inset:0;pointer-events:none}
.nav button{position:absolute;top:50%;transform:translateY(-50%);pointer-events:auto;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:none;background:rgba(0,0,0,.42);color:#fff;font-size:20px;line-height:1;cursor:pointer}
.nav button:hover{background:rgba(0,0,0,.58)}
.nav button[data-step="-1"]{left:6px}
.nav button[data-step="1"]{right:6px}
.nav-idx{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);padding:2px 9px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;font-size:11.5px;pointer-events:none}
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
`,
    body: (a, f) => {
      const imgs = f || [];
      const { cards: plan, sources } = planXhsDeck(a);
      const cards = plan.map((card) => {
        if (card.type === 'cover') {
          const first = card.imageIndex >= 0 ? imgs[card.imageIndex] : null;
          return first
            ? { cls: 'card cover', html: `<img class="cover-img" src="${dataSrc(first)}" alt=""><div class="shade"></div><div class="cover-text">${esc(plain(a.title))}</div>` }
            : { cls: 'card cover noimg', html: `<div class="cover-text">${esc(plain(a.title))}</div>` };
        }
        if (card.type === 'image') {
          const item = imgs[card.imageIndex];
          return { cls: 'card media', html: `<img class="shot" src="${dataSrc(item)}" alt=""><div class="cap">${esc(plain(item.img.caption || ''))}</div>` };
        }
        if (card.type === 'text') {
          return { cls: 'card text', html: `<div class="body">${card.text.split(/\n+/).map(t => t.trim()).filter(Boolean).map(t => `<p>${esc(plain(t))}</p>`).join('')}</div>` };
        }
        const tags = (a.tags || []).map(t => `<span>#${esc(plain(t).replace(/^#+/, ''))}</span>`).join('');
        return { cls: 'card end', html: `${a.cta ? `<div class="cta">${esc(plain(a.cta))}</div>` : ''}${tags ? `<div class="pills">${tags}</div>` : ''}` };
      });
      const total = cards.length;
      const html = cards.map((c, i) => `<section class="${c.cls}${i === 0 ? ' is-active' : ''}">${c.html}<span class="idx">${i + 1}/${total}</span></section>`).join('\n');
      const src = sources.length
        ? `<div class="src"><b>事实来源（内部对照，不计入发布正文）</b><br>${sources.map((s) => esc(plain(s))).join('<br>')}</div>`
        : '';
      // 手机端翻页：不靠滑动，用左右按钮；没脚本时退化成竖排全部可见，内容不丢。
      const nav = `<div class="nav"><button type="button" data-step="-1" aria-label="上一张">‹</button><button type="button" data-step="1" aria-label="下一张">›</button><span class="nav-idx">1 / ${total}</span></div>
<script>(function(){var cards=[].slice.call(document.querySelectorAll('.deck > .card'));var out=document.querySelector('.nav-idx');var at=0;function show(n){at=Math.max(0,Math.min(cards.length-1,n));cards.forEach(function(c,k){c.classList.toggle('is-active',k===at)});if(out)out.textContent=(at+1)+' / '+cards.length;}[].forEach.call(document.querySelectorAll('.nav button'),function(btn){btn.addEventListener('click',function(){show(at+Number(btn.getAttribute('data-step')))})});show(0);})();<\/script>`;
      return `<div class="hint">${total} 张卡片 · 用卡片两侧的左右按钮翻页，也可以按键盘 ← →</div>\n<div class="deck">\n${html}\n${nav}\n</div>\n${src}`;
    },
  },

  // 微博：短文案流，标签前置，配图走九宫格小图
  feed: {
    css: `body{max-width:540px;margin:0 auto;padding:22px;${FONT}color:#222;font-size:15px;line-height:1.8;background:#fafafa}
.pills-top{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.pills-top span{color:#eb7350;font-size:14px}
p.flow{font-size:15px;margin:0 0 8px}
figure{display:inline-flex;width:calc(33.33% - 6px);margin:3px;vertical-align:top}
figure img{width:100%;height:110px;object-fit:cover;border-radius:6px;display:block}
figcaption{display:none}
p.cta{margin-top:12px;color:#eb7350;font-weight:600}`,
    body: (a, f) => `${tagPills(a.tags, 'pills-top')}
${a.lead ? `<p class="flow">${esc(plain(a.lead))}</p>` : ''}
${paras(a.body, 'flow')}
<div class="figs">${figures(f, 'flow')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}`,
  },

  // 门店海报：单页海报，固定画幅一屏看完，主视觉就该大
  poster: {
    css: `body{margin:0;padding:24px 0;${FONT}background:#e8e9ec;color:#111}
.page{width:620px;height:820px;margin:0 auto;background:#fff;box-shadow:0 12px 34px rgba(0,0,0,.16);display:flex;flex-direction:column;overflow:hidden}
.page .shot{width:100%;height:318px;object-fit:cover;display:block;flex:0 0 auto}
.page .cap{font-size:11px;color:#999;padding:6px 32px 0}
.headline{padding:18px 32px 4px;font-weight:800;line-height:1.14;letter-spacing:.02em}
.sub{padding:0 32px;font-size:16px;color:#555;line-height:1.55;max-height:50px;overflow:hidden}
ul.points{margin:0;padding:14px 32px 0 52px;font-size:17px;line-height:1.85}
ul.points li{font-weight:600;margin-bottom:2px}
.foot{margin-top:auto;padding:16px 32px 24px;font-size:14px;font-weight:700;color:#8a2b2b;border-top:1px solid #f0eeee;line-height:1.55;max-height:86px;overflow:hidden}`,
    body: (a, f) => {
      const first = (f || [])[0];
      const rawTitle = plain(a.title);
      const titleSize = rawTitle.length > 20 ? 26 : rawTitle.length > 14 ? 32 : 42;
      const points = posterPoints(a.body, 3, 16);
      return `<div class="page">
${first ? `<img class="shot" src="${dataSrc(first)}" alt=""><div class="cap">${esc(plain(first.img.caption || ''))}</div>` : ''}
<div class="headline" style="font-size:${titleSize}px">${esc(rawTitle)}</div>
${a.lead ? `<div class="sub">${esc(clampText(a.lead, 46))}</div>` : ''}
${points.length ? `<ul class="points">${points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
${a.cta ? `<div class="foot">${esc(clampText(a.cta, 60))}</div>` : ''}
</div>`;
    },
  },

  // 销售朋友圈：桌面上就是一张 380 宽的手机卡，配图小网格
  moment: {
    css: `body{margin:0;padding:22px 14px;${FONT}background:#ededed;color:#191919}
.post{width:380px;max-width:100%;margin:0 auto;background:#fff;border-radius:8px;padding:14px 14px 12px}
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
.clip{max-width:380px;margin:10px auto 0;font-size:11px;color:#9a9a9a;text-align:center;line-height:1.7}`,
    body: (a, f) => {
      const { shown, full, expanded, length } = momentText(a, 300);
      const imgs = (f || []).slice(0, 9);
      const count = imgs.length;
      const gridClass = count === 1 ? 'n1' : count === 2 ? 'n2' : count === 3 ? 'n3' : 'n4';
      const grid = count
        ? `<div class="grid ${gridClass}">${imgs.map((item) => `<img src="${dataSrc(item)}" alt="">`).join('')}</div>`
        : '';
      const textBlock = `<span class="text">${esc(shown)}</span>`;
      const more = expanded
        ? `<details class="more"><summary>${textBlock}<span class="lbl-open">展开全文（共 ${length} 字）</span><span class="lbl-close">收起</span></summary><div class="full">${esc(full)}</div></details>`
        : textBlock;
      const notes = [];
      if (count) notes.push(`配图 ${count} 张 · 取自知识库原图`);
      return `<div class="post">
${more}
${grid}
</div>
${notes.length ? `<div class="clip">${esc(notes.join('；'))}</div>` : ''}`;
    },
  },

  // 企业采购方案：文档式，分节编号，图小、带框
  doc: {
    css: `body{max-width:760px;margin:0 auto;padding:32px 28px;${FONT}color:#1a1a1a;font-size:15px;line-height:1.85}
h1{font-size:24px;border-bottom:2px solid #1a1a1a;padding-bottom:10px;line-height:1.4}
.abstract{background:#f4f6f8;padding:14px 16px;border-radius:6px;font-size:14px;color:#444}
h2{font-size:16px;margin:22px 0 8px;color:#0b4f8a}
h3{font-size:15px;margin:18px 0 6px;color:#0b4f8a}
figure{margin:20px 0;display:flex;flex-direction:column;gap:8px}
figure img{display:block;margin:0 auto;width:auto;max-width:min(100%,420px);max-height:300px;height:auto;object-fit:contain;border-radius:4px;background:#f7f4f6}
figcaption{font-size:12.5px;color:#8b7d84;line-height:1.7;text-align:center}
figure{margin:16px 0}figure img{border:1px solid #e3e6ea}
p.cta{margin-top:24px;padding:14px 16px;border:1px dashed #0b4f8a;border-radius:6px;font-weight:600}`,
    body: (a, f) => `<h1>${esc(plain(a.title))}</h1>
${a.lead ? `<div class="abstract">${esc(plain(a.lead))}</div>` : ''}
<h2>需求与适用条件</h2>
<div class="flow">${flowHtml(a, f, 'center')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}`,
  },
};

// 每种平台都套一层「平台外壳」（头像、昵称、关注、底部互动条），
// 让预览和下载出来的稿子看起来就是那个平台的一屏，而不是一份中性文档。
export function buildPublishHtml({ article, loaded, spec, generatedTime, meta }) {
  const kind = spec?.layout && LAYOUTS[spec.layout] ? spec.layout : 'article';
  const layout = LAYOUTS[kind];
  const dateStr = generatedTime || '';
  const body = layout.body(article, loaded || [], dateStr);
  const info = chromeInfo({platform: spec?.label || meta?.platform, product: meta?.product, audience: meta?.audience, time: dateStr});
  const width = {article: 620, news: 700, qa: 680, feed: 540, poster: 620, moment: 380, doc: 760, card: 1080}[kind] || 620;
  // 页面本身退成灰色背景，真正的「平台界面」是中间那张卡；
  // 手机（iframe 宽 390）时去掉外边距，让外壳铺满屏幕。
  const pageCss = `body{margin:0 auto;padding:22px 12px;background:#eef0f3;max-width:none}
.pf{--pf-w:${width}px}
@media (max-width:520px){body{padding:0;background:#fff}.pf{border:0;border-radius:0;max-width:none}}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${BASE}${layout.css}${CHROME_CSS}${pageCss}</style></head><body>
<div class="pf pf-${kind}">
${chromeTopHtml(kind, info)}
<div class="pf-body">
${body}
</div>
${chromeBottomHtml(kind, info)}
</div>
</body></html>`;
}

export const layoutKindOf = (spec) => (spec?.layout && LAYOUTS[spec.layout] ? spec.layout : 'article');

// 结果页预览复用同一份朋友圈文案规则（截断 + 展开全文），两边不许各写一套。
export {momentText};
