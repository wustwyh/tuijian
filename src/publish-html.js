// 按平台生成自包含 HTML 发布稿。
// 不同平台不是换字号，而是版式结构不同：顺序、标题形态、图注对齐、标签位置、是否分栏。
import {inlinePlainText, parseHeading} from './publication.js';
import {planXhsDeck} from './card-deck.js';
import {buildArticleFlow} from './article-flow.js';

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

// 朋友圈文案：平台默认只显示 150 字左右，超出部分微信会折叠。
// 这里按同样的规则处理——卡内只放前 150 字，剩余全文放进「展开全文」，点了能看全，不丢内容。
function momentText(article, limit = 150) {
  const body = [article?.lead, article?.body].filter(Boolean).map((t) => plain(t)).join('\n');
  const cta = article?.cta ? plain(article.cta) : '';
  const ctaShown = cta ? clampText(cta, 45) : '';
  // 留出换成换行的 1 个字符，保证卡内文本严格不超过 limit。
  const room = Math.max(60, limit - (ctaShown ? ctaShown.length + 1 : 0));
  const cut = body.length > room;
  const head = cut ? `${body.slice(0, room - 1)}…` : body;
  const shown = [head, ctaShown].filter(Boolean).join('\n');
  const full = [body, cta].filter(Boolean).join('\n');
  return {
    shown,
    full,
    expanded: shown !== full,
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

// 篇幅与配图数量提示：不静默截断内容，让使用者知道该平台还能不能直接发。
// 朋友圈例外：卡片内自动按 150 字展示并给「展开全文」，不需要再吓唬使用者。
function lengthWarnings(article, spec) {
  if (!spec) return [];
  const out = [];
  const bodyLength = String(article.body || '').replace(/\s/g, '').length;
  if (spec.bodyMax && bodyLength > spec.bodyMax && spec.id !== 'moments')
    out.push(`正文 ${bodyLength} 字，超出「${spec.label}」建议上限 ${spec.bodyMax} 字，建议精简后再发布。`);
  const titleLength = String(article.title || '').length;
  if (spec.titleMax && titleLength > spec.titleMax)
    out.push(`标题 ${titleLength} 字，超出「${spec.label}」上限 ${spec.titleMax} 字。`);
  const count = (article.image_plan || []).length;
  if (count < spec.imageMin)
    out.push(`配图 ${count} 张，少于「${spec.label}」要求的 ${spec.imageMin} 张。`);
  if (count > spec.imageMax)
    out.push(`配图 ${count} 张，多于「${spec.label}」上限 ${spec.imageMax} 张。`);
  return out;
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

const BASE = 'box-sizing:border-box;';
const WARN = '.plat-warn{margin:0;padding:10px 16px;background:#fff7e6;border-bottom:1px solid #ffe1a8;color:#8a6d3b;font-size:12px;line-height:1.7}.plat-warn b{font-weight:700}';
const FONT = 'font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;';

// 每种版式：容器宽度、排版基调、结构顺序都不同。
const LAYOUTS = {
  // 公众号长图文：窄栏、导语、分段正文、居中图注
  article: {
    css: `body{max-width:640px;margin:0 auto;padding:24px;${FONT}color:#222;line-height:1.8}
h1{font-size:24px;line-height:1.4;margin:0 0 12px}p.lead{color:#576b95;background:#f6f7f9;padding:12px 14px;border-radius:6px}
h3{font-size:19px;line-height:1.5;margin:26px 0 8px;color:#1f2d3d}
.fig-center{margin:20px 0;text-align:center}.fig-center img{width:100%;border-radius:8px}
.fig-center figcaption{font-size:13px;color:#888;margin-top:6px}
p.cta{margin-top:24px;font-weight:600;color:#1f2d3d}`,
    body: (a, f) => `<h1>${esc(plain(a.title))}</h1>
${a.lead ? `<p class="lead">${esc(plain(a.lead))}</p>` : ''}
<div class="flow">${flowHtml(a, f, 'center')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}
${tagPills(a.tags, 'tags')}`,
  },

  // 新闻稿：报头式，标题左对齐加粗、日期行、图注独立
  news: {
    css: `body{max-width:720px;margin:0 auto;padding:28px;${FONT}color:#111;line-height:1.9}
.dateline{font-size:12px;letter-spacing:.08em;color:#8a6d3b;border-bottom:2px solid #8a6d3b;padding-bottom:8px}
h1{font-size:26px;margin:18px 0 14px;text-align:left}p.lead{font-weight:600;color:#333}
h3{font-size:18px;line-height:1.5;margin:24px 0 8px;color:#1a1a1a}
.fig-left{margin:18px 0}.fig-left img{width:100%}
.fig-left figcaption{font-size:12px;color:#777;border-left:3px solid #ddd;padding-left:8px;margin-top:6px;text-align:left}
p.cta{margin-top:20px;font-size:14px;color:#555}`,
    body: (a, f, dateStr) => `<p class="dateline">${esc(dateStr)}　产品资讯</p>
<h1>${esc(plain(a.title))}</h1>
${a.lead ? `<p class="lead">${esc(plain(a.lead))}</p>` : ''}
<div class="flow">${flowHtml(a, f, 'left')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}`,
  },

  // 知乎：问答式，问题作标题，分段推进
  qa: {
    css: `body{max-width:700px;margin:0 auto;padding:24px;${FONT}color:#1a1a1a;line-height:1.85}
h1.q{font-size:22px;font-weight:700;border-left:4px solid #0084ff;padding-left:12px}
p.lead{color:#556}p{text-align:justify}
h3{font-size:18px;line-height:1.5;margin:26px 0 8px;border-left:3px solid #0084ff;padding-left:10px;color:#13283f}
.fig-center{margin:20px 0}.fig-center img{width:100%;border-radius:4px}
.fig-center figcaption{font-size:12px;color:#999;text-align:center;margin-top:6px}
p.cta{margin-top:22px;padding:12px 14px;background:#f3f8ff;border-radius:6px}`,
    body: (a, f) => `<h1 class="q">${esc(plain(a.title))}</h1>
${a.lead ? `<p class="lead">${esc(plain(a.lead))}</p>` : ''}
<div class="flow">${flowHtml(a, f, 'center')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}
${tagPills(a.tags, 'tags')}`,
  },

  // 小红书：一屏一卡、左右翻的笔记卡片流（3:4 卡面 + 翻页提示 + 页码）
  card: {
    css: `body{margin:0;padding:0 0 22px;${FONT}color:#2b2b2b;background:#f4f4f6}
.hint{padding:14px 16px 8px;font-size:12px;color:#9a9a9a;text-align:center;letter-spacing:.03em}
.deck{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:4px 16px 18px}
.deck::-webkit-scrollbar{height:6px}.deck::-webkit-scrollbar-thumb{background:#dcdce0;border-radius:99px}
.card{flex:0 0 auto;width:340px;height:453px;scroll-snap-align:center;border-radius:18px;overflow:hidden;position:relative;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.09);display:flex;flex-direction:column}
.card .idx{position:absolute;right:10px;bottom:8px;font-size:11px;color:rgba(0,0,0,.3);z-index:3}
.card.cover .cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.card.cover .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(0,0,0,.78))}
.card.cover .cover-text{position:relative;margin-top:auto;padding:22px;color:#fff;font-size:23px;font-weight:800;line-height:1.34;z-index:2}
.card.cover.noimg{background:linear-gradient(150deg,#ffe8ef,#ffe0e8 45%,#f7d9ff)}
.card.cover.noimg .cover-text{color:#2b2b2b;margin:auto 0;padding:28px}
.card.media .shot{width:100%;flex:1;min-height:0;object-fit:cover;display:block;background:#fafafa}
.card.media .cap{padding:10px 15px;font-size:12px;color:#8a8a8a;line-height:1.55}
.card.text .body{padding:28px 22px;font-size:15px;line-height:1.9;overflow:hidden}
.card.text .body p{margin:0 0 10px}
.card.text .body p:last-child{margin-bottom:0}
.card.end{background:linear-gradient(155deg,#fff6f8,#ffeaf0);justify-content:center;gap:16px;padding:28px 24px}
.card.end .cta{font-size:16px;font-weight:700;line-height:1.7;color:#a3244b}
.card.end .pills{display:flex;flex-wrap:wrap;gap:8px}
.card.end .pills span{background:#fff;color:#c2185b;font-size:13px;padding:5px 11px;border-radius:999px}
.src{max-width:620px;margin:14px auto 0;padding:0 16px;font-size:11px;color:#9a9a9a;line-height:1.7}`,
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
          return { cls: 'card text', html: `<div class="body">${card.text.split('\n').map(t => `<p>${esc(plain(t))}</p>`).join('')}</div>` };
        }
        const tags = (a.tags || []).map(t => `<span>#${esc(plain(t).replace(/^#+/, ''))}</span>`).join('');
        return { cls: 'card end', html: `${a.cta ? `<div class="cta">${esc(plain(a.cta))}</div>` : ''}${tags ? `<div class="pills">${tags}</div>` : ''}` };
      });
      const total = cards.length;
      const html = cards.map((c, i) => `<section class="${c.cls}">${c.html}<span class="idx">${i + 1}/${total}</span></section>`).join('\n');
      // 摘出来的「事实来源」清单放在卡片外的小字区：不上帖面，也不丢。
      const src = sources.length
        ? `<div class="src"><b>事实来源（内部对照，不计入发布正文）</b><br>${sources.map((s) => esc(plain(s))).join('<br>')}</div>`
        : '';
      return `<div class="hint">左右滑动查看 ${total} 张卡片 · 一屏一卡</div>\n<div class="deck">\n${html}\n</div>\n${src}`;
    },
  },

  // 微博：短文案流，标签前置，无标题层级
  feed: {
    css: `body{max-width:560px;margin:0 auto;padding:22px;${FONT}color:#222;line-height:1.8;background:#fafafa}
.pills-top{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.pills-top span{color:#eb7350;font-size:14px}
p.flow{font-size:15px;margin:0 0 8px}
.fig-flow{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 0}
.fig-flow img{width:100%;border-radius:6px;display:block}
.fig-flow figcaption{font-size:11px;color:#999}
p.cta{margin-top:12px;color:#eb7350;font-weight:600}`,
    body: (a, f) => `${tagPills(a.tags, 'pills-top')}
${a.lead ? `<p class="flow">${esc(plain(a.lead))}</p>` : ''}
${paras(a.body, 'flow')}
${figures(f, 'flow')}
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}`,
  },

  // 门店海报：单页海报，固定画幅一屏看完，不跟随窗口拉长
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

  // 销售朋友圈：纯短文案，无标题无标签，图小
  moment: {
    css: `body{margin:0;padding:22px 14px;${FONT}background:#ededed;color:#191919}
.post{max-width:380px;margin:0 auto;background:#fff;border-radius:8px;padding:14px 14px 12px}
.text{display:block;font-size:15px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
/* 折叠态：摘要里装「前 150 字 + 展开全文」；展开态：正文在上，收起按钮排到最后。
   这样展开后不会再重复一遍截断文本，收起按钮也始终贴在文字最下面。 */
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
      const { shown, full, expanded, length } = momentText(a, 150);
      const imgs = (f || []).slice(0, 9);
      const count = imgs.length;
      const gridClass = count === 1 ? 'n1' : count === 2 ? 'n2' : count === 3 ? 'n3' : 'n4';
      const grid = count
        ? `<div class="grid ${gridClass}">${imgs.map((item) => `<img src="${dataSrc(item)}" alt="">`).join('')}</div>`
        : '';
      // 超出 150 字不丢：卡内先展示前 150 字，点「展开全文」换成完整文案，截断版不再重复出现。
      const textBlock = `<span class="text">${esc(shown)}</span>`;
      const more = expanded
        ? `<details class="more"><summary>${textBlock}<span class="lbl-open">展开全文（共 ${length} 字）</span><span class="lbl-close">收起</span></summary><div class="full">${esc(full)}</div></details>`
        : textBlock;
      // 朋友圈没有标题、没有话题标签；卡外只留一行溯源说明，不干扰卡面观感。
      const notes = [];
      if (count) notes.push(`配图 ${count} 张 · 取自知识库原图`);
      if (expanded) notes.push(`卡内按朋友圈篇幅展示 ${shown.length} 字，点「展开全文」看完整文案`);
      return `<div class="post">
${more}
${grid}
</div>
${notes.length ? `<div class="clip">${esc(notes.join('；'))}</div>` : ''}`;
    },
  },

  // 企业采购方案：文档式，分节编号
  doc: {
    css: `body{max-width:760px;margin:0 auto;padding:32px;${FONT}color:#1a1a1a;line-height:1.85}
h1{font-size:24px;border-bottom:2px solid #1a1a1a;padding-bottom:10px}
.abstract{background:#f4f6f8;padding:14px 16px;border-radius:6px;font-size:14px;color:#444}
h2{font-size:16px;margin:22px 0 8px;color:#0b4f8a}
h3{font-size:15px;margin:18px 0 6px;color:#0b4f8a}
.fig-center{margin:16px 0}.fig-center img{width:100%;border:1px solid #e3e6ea}
.fig-center figcaption{font-size:12px;color:#888;margin-top:6px}
p.cta{margin-top:24px;padding:14px 16px;border:1px dashed #0b4f8a;border-radius:6px;font-weight:600}`,
    body: (a, f) => `<h1>${esc(plain(a.title))}</h1>
${a.lead ? `<div class="abstract">${esc(plain(a.lead))}</div>` : ''}
<h2>需求与适用条件</h2>
<div class="flow">${flowHtml(a, f, 'center')}</div>
${a.cta ? `<p class="cta">${esc(plain(a.cta))}</p>` : ''}`,
  },
};

export function buildPublishHtml({ article, loaded, spec, generatedTime }) {
  const kind = spec?.layout && LAYOUTS[spec.layout] ? spec.layout : 'article';
  const layout = LAYOUTS[kind];
  const dateStr = generatedTime || '';
  const body = layout.body(article, loaded || [], dateStr);
  const warns = lengthWarnings(article, spec);
  const warnHtml = warns.length
    ? `<div class="plat-warn"><b>篇幅提示（${esc(spec.label)}）</b><ul>${warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>`
    : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(plain(article.title))}</title>
<style>${BASE}${WARN}${layout.css}</style></head><body>
${warnHtml}
${body}
</body></html>`;
}

export const layoutKindOf = (spec) => (spec?.layout && LAYOUTS[spec.layout] ? spec.layout : 'article');

// 结果页预览复用同一份朋友圈文案规则（截断到 150 字 + 展开全文），两边不许各写一套。
export {momentText};
