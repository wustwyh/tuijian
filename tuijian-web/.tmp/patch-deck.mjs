import {readFileSync, writeFileSync} from "node:fs";
const file = "src/card-deck.js";
const src = readFileSync(file, "utf8");
const oldBlock = `  const source = [article?.lead, article?.body].filter(Boolean).join('\\n');
  const { text, sources } = splitSourceBlock(inlinePlainText(source));
  const blocks = packTextBlocksDetailed(text, { maxHeight: CARD.contentHeight });
  blocks.forEach((block) => cards.push({ type: 'text', text: block.text, paraIndex: block.paraIndex, paraText: block.paraText }));`;
if (!src.includes(oldBlock)) throw new Error("找不到原块");
const newBlock = `  // 每块要记清来自「导语」还是「正文」：卡片上改字时，导语改 lead、正文改 body。
  const leadBlocks = article?.lead
    ? packTextBlocksDetailed(inlinePlainText(article.lead), { maxHeight: CARD.contentHeight }).map((b) => ({ ...b, from: 'lead' }))
    : [];
  const { text, sources } = splitSourceBlock(inlinePlainText(article?.body || ''));
  const bodyBlocks = packTextBlocksDetailed(text, { maxHeight: CARD.contentHeight }).map((b) => ({ ...b, from: 'body' }));
  [...leadBlocks, ...bodyBlocks].forEach((block) => cards.push({ type: 'text', text: block.text, paraText: block.paraText, from: block.from }));`;
writeFileSync(file, src.replace(oldBlock, newBlock));
console.log("ok");
