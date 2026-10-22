// 小红书卡片流的分页方案：预览与导出共用，保证「一屏一卡」的结构完全一致。
// 卡片顺序：封面卡（首图+标题）→ 图卡（其余图片各占一屏）→ 文字卡（正文分块）→ 结尾卡（CTA+标签）。
import {inlinePlainText} from './publication.js';

// 卡面几何必须和下面两处 CSS 一致，否则文字会被 overflow:hidden 静默裁掉：
//   导出 src/publish-html.js       .card.text .body
//   预览 src/pages/platform-layout.css  .xhs-card.text .xhs-body
// 340×453 卡面、正文内边距上下 28px / 左右 22px、字号 15px、行高 1.9、段间距 10px。
const CARD = {
  contentWidth: 340 - 22 * 2,        // 296px
  contentHeight: 453 - 28 * 2,       // 397px
  lineHeight: 15 * 1.9,              // 28.5px
  paraGap: 10,                       // p{margin:0 0 10px}
  safety: 10,                        // 换行估算与字体差异的余量
};
const CHARS_PER_LINE = Math.floor(CARD.contentWidth / 15); // 19 个全角字
const MAX_LINES = Math.floor((CARD.contentHeight - CARD.safety) / CARD.lineHeight); // 13 行

// 半角按 0.55 字宽估，全角按 1 字宽估：宁可少放一点，也不要顶出卡面被裁。
const charWidth = (ch) => (/[\u0000-\u007f]/.test(ch) ? 0.55 : 1);
const textWidth = (text) => { let w = 0; for (const ch of String(text)) w += charWidth(ch); return w; };
const lineCount = (text) => Math.max(1, Math.ceil(textWidth(text) / CHARS_PER_LINE));

const SENTENCE_END = /[。！？!?；;…]/;

// 句末标点后断开，标点留在前一句里；没有标点的段落再按字数硬切。
function splitSentences(paragraph) {
  const out = [];
  let cur = '';
  for (const ch of String(paragraph)) {
    cur += ch;
    if (SENTENCE_END.test(ch)) { out.push(cur); cur = ''; }
  }
  if (cur.trim()) out.push(cur);
  return out.filter((s) => s.trim());
}

// 单句超过一整张卡时按字数硬切，切点不插入任何字符，保证内容不丢也不多。
function hardSplit(sentence, maxChars) {
  if (!Number.isFinite(maxChars) || sentence.length <= maxChars) return [sentence];
  const out = [];
  for (let i = 0; i < sentence.length; i += maxChars) out.push(sentence.slice(i, i + maxChars));
  return out;
}

// 把一段正文切成若干「段内片段」：优先在句末断开，但同一片段里的句子仍是同一段（同一个 <p>），
// 只有跨卡时才拆开。这样续行估算与真实换行一致，不会因为每句都另起一段而白占一行。
function paragraphSegments(paragraph, charCap) {
  const out = [];
  let cur = '';
  for (const sentence of splitSentences(paragraph)) {
    for (const piece of hardSplit(sentence, charCap)) {
      if (cur && cur.length + piece.length > charCap) { out.push(cur); cur = ''; }
      cur += piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// 按「行数」而不是「字数」分页：中英混排、标点、空格都会改变实际行数。
// maxChars 是额外的字数上限（兼容按字数分页的旧用法），maxHeight 是卡面可用高度。
export function packTextBlocks(source, { maxChars = Infinity, maxHeight = Infinity } = {}) {
  // 先按发布视图清洗（去掉 [f_n]、**、反引号），再按清洗后的字面量估算行数：
  // 量的是真正画到卡面上的文字，否则会按带标记的原文高估而过度分页。
  // 卡面不需要 markdown 分节，段首的 # 一并去掉。
  const paragraphs = inlinePlainText(source).split(/\r?\n+/)
    .map((t) => t.trim().replace(/^(?:#{1,6}\s+)+/, '').trim())
    .filter(Boolean);
  const heightLimit = Number.isFinite(maxHeight) ? Math.max(1, maxHeight - CARD.safety) : Infinity;
  const linesPerCard = Number.isFinite(heightLimit) ? Math.floor(heightLimit / CARD.lineHeight) : Infinity;
  const charCap = Math.min(maxChars, Number.isFinite(linesPerCard) ? linesPerCard * CHARS_PER_LINE : Infinity);

  const pieces = [];
  for (const paragraph of paragraphs) {
    for (const segment of paragraphSegments(paragraph, charCap)) pieces.push(segment);
  }

  const blocks = [];
  let current = [];
  let usedPx = 0;
  let usedChars = 0;
  for (const piece of pieces) {
    const px = lineCount(piece) * CARD.lineHeight + CARD.paraGap;
    const fits = current.length === 0
      ? px <= heightLimit
      : usedPx + px <= heightLimit && usedChars + piece.length <= maxChars;
    if (!fits && current.length) {
      blocks.push(current.join('\n'));
      current = [];
      usedPx = 0;
      usedChars = 0;
    }
    current.push(piece);
    usedPx += px;
    usedChars += piece.length;
  }
  if (current.length) blocks.push(current.join('\n'));
  return blocks;
}

// 兼容旧签名：按字数分块（测试与外部调用）。
export function chunkParagraphs(text, size = 300) {
  return packTextBlocks(text, { maxChars: size });
}

// 结尾卡前的「事实来源 / 参考资料」清单是内部对照信息，不能当正文帖到小红书上。
// 这里把它从正文里摘出来，由调用方放到卡片外的小字区，既不上卡面也不静默丢掉。
const SOURCE_HEAD = /^[\s#>*_=【\[─━═—–\-]*(事实来源|参考来源|参考资料|信息来源|资料来源|数据来源)[\s】\]─━═—–_=*#-]*$/;

export function splitSourceBlock(text) {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/);
  const at = lines.findIndex((line) => SOURCE_HEAD.test(line.trim()));
  if (at < 0) return { text: raw, sources: [] };
  return {
    text: lines.slice(0, at).join('\n'),
    sources: lines.slice(at + 1).map((line) => line.trim()).filter(Boolean),
  };
}

export function planXhsDeck(article) {
  const images = article?.image_plan || [];
  const cards = [{ type: 'cover', imageIndex: images.length ? 0 : -1 }];
  for (let i = 1; i < images.length; i += 1) cards.push({ type: 'image', imageIndex: i });
  const source = [article?.lead, article?.body].filter(Boolean).join('\n');
  const { text, sources } = splitSourceBlock(inlinePlainText(source));
  const blocks = packTextBlocks(text, { maxHeight: CARD.contentHeight });
  blocks.forEach((text) => cards.push({ type: 'text', text }));
  cards.push({ type: 'end' });
  return { cards, sources };
}

export function planXhsCards(article) {
  return planXhsDeck(article).cards;
}

export const CARD_TEXT_CAPACITY = { lines: MAX_LINES, charsPerLine: CHARS_PER_LINE };
