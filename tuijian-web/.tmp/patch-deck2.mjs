import {readFileSync, writeFileSync} from 'node:fs';
const f = 'src/card-deck.js';
let s = readFileSync(f, 'utf8');

const start = s.indexOf('// 按「行数」而不是「字数」分页');
const end = s.indexOf('// 兼容旧签名：按字数分块（测试与外部调用）。');
if (start < 0 || end < 0) { console.log('NO MATCH'); process.exit(1); }

const replacement = `// 把正文拆成「一段一块」或「一段拆成几块」的片段。
// 整段放得下就整段给（whole=true）；一段比一整张卡还长才拆（whole=false）。
function makePieces(paragraphs, charCap) {
  const pieces = [];
  paragraphs.forEach((paragraph, paraIndex) => {
    const segments = paragraphSegments(paragraph, charCap);
    const whole = segments.length <= 1;
    segments.forEach((segment, part) => pieces.push({segment, paraIndex, paraText: paragraph, whole, part}));
  });
  return pieces;
}

// 一页写满再翻页：短段落能塞多少塞多少，塞不下才换下一张卡。
// 唯一例外是「被拆开的长段落」——它的续块必须紧跟同一段，不能在新卡里混别的段落。
function packPieces(pieces, {heightLimit, charCap, maxChars}) {
  const groups = [];
  let current = [];
  let usedPx = 0;
  let usedChars = 0;
  const charLimit = Math.min(maxChars, Number.isFinite(charCap) ? charCap : Infinity);
  const flush = () => {
    if (!current.length) return;
    groups.push(current);
    current = [];
    usedPx = 0;
    usedChars = 0;
  };
  for (const piece of pieces) {
    const px = lineCount(piece.segment) * CARD.lineHeight + CARD.paraGap;
    const partialGroup = current.length > 0 && !current[0].whole;
    const fits = current.length === 0
      ? px <= heightLimit
      : partialGroup
        ? piece.paraIndex === current[0].paraIndex && usedPx + px <= heightLimit && usedChars + piece.segment.length <= charLimit
        : piece.whole && usedPx + px <= heightLimit && usedChars + piece.segment.length <= charLimit;
    if (!fits) flush();
    current.push(piece);
    usedPx += px;
    usedChars += piece.segment.length;
  }
  flush();
  return groups;
}

function cleanParagraphs(source) {
  return inlinePlainText(source).split(/\\r?\\n+/)
    .map((t) => t.trim().replace(/^(?:#{1,6}\\s+)+/, '').trim())
    .filter(Boolean);
}

function limits({maxChars = Infinity, maxHeight = Infinity}) {
  const heightLimit = Number.isFinite(maxHeight) ? Math.max(1, maxHeight - CARD.safety) : Infinity;
  const linesPerCard = Number.isFinite(heightLimit) ? Math.floor(heightLimit / CARD.lineHeight) : Infinity;
  const charCap = Math.min(maxChars, Number.isFinite(linesPerCard) ? linesPerCard * CHARS_PER_LINE : Infinity);
  return {heightLimit, charCap, maxChars};
}

// 按「行数」而不是「字数」分页：中英混排、标点、空格都会改变实际行数。
// maxChars 是额外的字数上限（兼容按字数分页的旧用法），maxHeight 是卡面可用高度。
export function packTextBlocks(source, {maxChars = Infinity, maxHeight = Infinity} = {}) {
  // 先按发布视图清洗（去掉 [f_n]、**、反引号），再按清洗后的字面量估算行数：
  // 量的是真正画到卡面上的文字，否则会按带标记的原文高估而过度分页。
  // 卡面不需要 markdown 分节，段首的 # 一并去掉。
  const options = limits({maxChars, maxHeight});
  const groups = packPieces(makePieces(cleanParagraphs(source), options.charCap), options);
  return groups.map((group) => group.map((piece) => piece.segment).join('\\n\\n'));
}

// 与 packTextBlocks 同样的分页规则，但每块记下来自哪几段正文：
// 卡片上改字要能落回原文的某几段，不能只在卡面上改。
export function packTextBlocksDetailed(source, {maxChars = Infinity, maxHeight = Infinity} = {}) {
  const options = limits({maxChars, maxHeight});
  const groups = packPieces(makePieces(cleanParagraphs(source), options.charCap), options);
  return groups.map((group) => ({
    text: group.map((piece) => piece.segment).join('\\n\\n'),
    paraIndex: group[0].paraIndex,
    paraText: group[0].paraText,
    // 0 表示这一段太长、被拆成了几块；>0 表示这张卡里正好装着这么多整段
    paraCount: group[0].whole ? group.length : 0,
    segments: group.map((piece) => piece.segment),
  }));
}

`;

s = s.slice(0, start) + replacement + s.slice(end);
writeFileSync(f, s);
console.log('deck rewritten');
