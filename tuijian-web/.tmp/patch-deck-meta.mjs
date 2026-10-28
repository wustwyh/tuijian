import {readFileSync, writeFileSync} from "node:fs";

// planXhsDeck：把 paraCount/segments 带到卡片上
let f = "src/card-deck.js";
let s = readFileSync(f, "utf8");
s = s.replace(
"  [...leadBlocks, ...bodyBlocks].forEach((block) => cards.push({ type: 'text', text: block.text, paraText: block.paraText, from: block.from }));",
"  [...leadBlocks, ...bodyBlocks].forEach((block) => cards.push({\n    type: 'text',\n    text: block.text,\n    paraText: block.paraText,\n    paraCount: block.paraCount,\n    segments: block.segments,\n    from: block.from,\n  }));");
writeFileSync(f, s);

// 预览：多段卡片的改稿目标就是整张卡的文字
f = "src/pages/ArticlePreview.jsx";
s = readFileSync(f, "utf8");
s = s.replace(
"<Hit edit={edit} block={{kind: card.from === 'lead' ? 'lead' : 'para', text: card.paraText || card.text, segment: card.text}} as=\"div\"><SourceText text={publicationText(card.text)} /></Hit>",
"<Hit edit={edit} block={{kind: card.from === 'lead' ? 'lead' : 'para', text: card.paraCount > 1 ? card.text : (card.paraText || card.text), segment: card.text, paraCount: card.paraCount}} as=\"div\"><SourceText text={publicationText(card.text)} /></Hit>");
writeFileSync(f, s);
console.log("ok");
