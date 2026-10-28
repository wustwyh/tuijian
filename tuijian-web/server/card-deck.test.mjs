import test from 'node:test';
import assert from 'node:assert/strict';
import {planXhsCards, planXhsDeck, chunkParagraphs, CARD_TEXT_CAPACITY} from '../src/card-deck.js';

const article = (imageCount, body) => ({
  title: '标题',
  lead: '导语',
  body,
  cta: '行动引导',
  tags: ['话题'],
  image_plan: Array.from({ length: imageCount }, (_, i) => ({ image_id: `im_${i + 1}` })),
});

test('每张图片各占一页：封面用首图，其余图片逐一成卡', () => {
  const cards = planXhsCards(article(4, '正文一段'));
  const cover = cards.filter((c) => c.type === 'cover');
  const images = cards.filter((c) => c.type === 'image');
  assert.equal(cover.length, 1);
  assert.equal(cover[0].imageIndex, 0);
  assert.equal(images.length, 3);
  assert.deepEqual(images.map((c) => c.imageIndex), [1, 2, 3]);
});

test('没有配图时封面卡退化为纯文字卡', () => {
  const cards = planXhsCards(article(0, '正文'));
  assert.equal(cards[0].type, 'cover');
  assert.equal(cards[0].imageIndex, -1);
  assert.equal(cards.filter((c) => c.type === 'image').length, 0);
});

test('结尾卡恒存在且位于最后', () => {
  const cards = planXhsCards(article(2, '正文'));
  assert.equal(cards[cards.length - 1].type, 'end');
  assert.ok(cards.length >= 4, '至少包含封面/图卡/文字卡/结尾卡');
});

test('长正文被切成多张文字卡，不会堆在一页', () => {
  const body = Array.from({ length: 24 }, (_, i) => `第${i + 1}段：`.padEnd(60, '内容')).join('\n');
  const cards = planXhsCards(article(1, body));
  const texts = cards.filter((c) => c.type === 'text');
  assert.ok(texts.length >= 3, `应切成多张文字卡，实际 ${texts.length}`);
  for (const card of texts) assert.ok(card.text.length <= 460, '单卡文字不应过长');
});

test('段落切分不丢内容', () => {
  const chunks = chunkParagraphs('甲段落\n乙段落\n丙段落', 5);
  assert.equal(chunks.join('\n').replace(/\n/g, ''), '甲段落乙段落丙段落');
  assert.ok(chunks.length >= 2);
});

test('空正文不产生文字卡', () => {
  const cards = planXhsCards({ title: '标题', image_plan: [] });
  assert.equal(cards.filter((c) => c.type === 'text').length, 0);
});

// 卡面只有 13 行可写（340×453、上下各 28px 内边距、15px/1.9），多一行就会被 overflow:hidden 裁掉。
const linesOf = (paragraph) => {
  let width = 0;
  for (const ch of paragraph) width += /[\u0000-\u007f]/.test(ch) ? 0.55 : 1;
  return Math.max(1, Math.ceil(width / CARD_TEXT_CAPACITY.charsPerLine));
};

test('文字卡按卡面行数分页：每张卡都放得下，不会被裁掉', () => {
  const dense = Array.from({ length: 12 }, (_, i) => '华为笔记本的屏幕比例和分辨率决定长文档里的观感'.repeat(2)).join('\n');
  const cards = planXhsCards(article(3, dense));
  const texts = cards.filter((c) => c.type === 'text');
  assert.ok(texts.length >= 4, `应切成多张文字卡，实际 ${texts.length}`);
  for (const card of texts) {
    // 卡面可用高度 397px（453 - 上下各 28），段间距 10px，按像素算才准
    const paragraphs = card.text.split(/\n+/).filter(Boolean);
    const px = paragraphs.reduce((sum, p) => sum + linesOf(p) * 15 * 1.9, 0)
      + Math.max(0, paragraphs.length - 1) * 10;
    assert.ok(px <= 397, `单卡 ${px.toFixed(0)}px，超过卡面 397px：${card.text.slice(0, 20)}…`);
  }
});

test('卡面文字是发布视图：不含 [f_n] 引用与 ** 加粗标记', () => {
  const cards = planXhsCards(article(1, '**问题一：屏幕够不够用？**\n这块是3:2比例[f_4][f_5]，长文档一屏多看一截。'));
  const joined = cards.filter((c) => c.type === 'text').map((c) => c.text).join('');
  assert.ok(!joined.includes('[f_'), '卡面不应带引用标记');
  assert.ok(!joined.includes('**'), '卡面不应带 markdown 加粗');
  assert.ok(joined.includes('问题一：屏幕够不够用？'), '正文内容不能丢');
});

test('正文尾部的事实来源清单不上卡面，改为卡外返回', () => {
  const body = '先说结论，这台适合长期看文档。\n── 事实来源 ──\n[1] 产品事实·屏幕\n[2] 卖点与限制·接口';
  const { cards, sources } = planXhsDeck(article(1, body));
  const joined = cards.filter((c) => c.type === 'text').map((c) => c.text).join('');
  assert.ok(!joined.includes('事实来源'), '卡面不应出现来源清单标题');
  assert.ok(!joined.includes('[1]'), '卡面不应出现来源编号');
  assert.ok(joined.includes('先说结论'), '正文不能丢');
  assert.equal(sources.length, 2);
});
