// 图文穿插：按 image_plan 里每张图的 position 把图插进正文对应位置，
// 而不是把图全堆在文末。预览与导出共用这一份排布逻辑。
import {inlinePlainText} from './publication.js';

const COVER = /封面|首图|主图|头图|cover/i;
const HEAD = /开头|导语|引言|开篇/i;
const TAIL = /结尾|末尾|最后|行动引导|行动|cta|底部/i;
const STOP = /[后前中之的段落部分插入位置第条处以及]/g;

// 段落先过发布视图清洗：去掉 [f_n]、**、以及「![主视觉](image_id:…)」这类图片占位行，
// 清完为空的段落直接丢掉，否则正文里会留一串乱码或空行。
export function paragraphsOf(text) {
  return String(text || '').split(/\r?\n+/)
    .map((t) => inlinePlainText(t).trim())
    .filter(Boolean);
}

// 从 position 文本里提取可用于匹配段落的关键词，例如「屏幕段落后」→「屏幕」。
function keywordsOf(position) {
  const cleaned = String(position || '').replace(STOP, ' ').trim();
  return cleaned.split(/[\s,，、/|]+/).filter((w) => w.length >= 2);
}

/**
 * 返回按阅读顺序排列的区块：{type:'para', text} 与 {type:'figure', imageIndex}。
 * 规则优先级：封面 → 开头 → position 关键词命中段落 → 均匀分布 → 结尾。
 */
export function buildArticleFlow(article) {
  const paragraphs = paragraphsOf(article?.body);
  const images = article?.image_plan || [];
  const slots = paragraphs.map(() => []);
  const head = [];
  const tail = [];
  const undecided = [];

  images.forEach((image, index) => {
    const position = String(image?.position || '');
    if (COVER.test(position)) head.unshift(index);
    else if (HEAD.test(position)) head.push(index);
    else if (TAIL.test(position)) tail.push(index);
    else undecided.push({ index, position });
  });

  const leftover = [];
  for (const item of undecided) {
    const words = keywordsOf(item.position);
    let placed = false;
    for (const word of words) {
      const hit = paragraphs.findIndex((p) => p.includes(word));
      if (hit >= 0) {
        slots[hit].push(item.index);
        placed = true;
        break;
      }
    }
    if (!placed) leftover.push(item);
  }

  // 没有可靠位置信息的图，按比例均匀铺到正文里，避免全部堆在结尾。
  const count = leftover.length;
  leftover.forEach((item, k) => {
    if (paragraphs.length === 0) return;
    const target = Math.min(
      paragraphs.length - 1,
      Math.floor(((k + 1) * paragraphs.length) / (count + 1)),
    );
    slots[target].push(item.index);
  });

  const blocks = [];
  head.forEach((imageIndex) => blocks.push({ type: 'figure', imageIndex }));
  paragraphs.forEach((text, index) => {
    blocks.push({ type: 'para', text });
    slots[index].forEach((imageIndex) => blocks.push({ type: 'figure', imageIndex }));
  });
  tail.forEach((imageIndex) => blocks.push({ type: 'figure', imageIndex }));

  // 没有正文时，图片仍要全部输出，否则会丢图。
  if (paragraphs.length === 0) images.forEach((_, imageIndex) => blocks.push({ type: 'figure', imageIndex }));
  return blocks;
}

export const imagePositionOf = (flow, imageCount) => {
  const order = [];
  let paragraphSeen = 0;
  for (const block of flow) {
    if (block.type === 'para') paragraphSeen += 1;
    else order.push({ imageIndex: block.imageIndex, afterParagraphs: paragraphSeen });
  }
  // 补齐没有出现在 flow 里的图（理论上不会发生，作为兜底）
  for (let i = 0; i < imageCount; i += 1) {
    if (!order.some((o) => o.imageIndex === i)) order.push({ imageIndex: i, afterParagraphs: paragraphSeen });
  }
  return order;
};
