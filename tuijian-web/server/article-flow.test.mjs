import test from 'node:test';
import assert from 'node:assert/strict';
import {buildArticleFlow, paragraphsOf} from '../src/article-flow.js';

const img = (position, caption = '图') => ({ image_id: `im_${caption}`, position, caption, url: `/api/product-images/${caption}` });

const article = (body, images) => ({ title: 't', lead: 'l', body, cta: 'c', tags: [], image_plan: images });

const kinds = (flow) => flow.map((b) => (b.type === 'para' ? 'P' : `F${b.imageIndex}`));

test('封面图排在最前', () => {
  const flow = buildArticleFlow(article('第一段\n第二段', [img('封面'), img('body')]));
  assert.equal(flow[0].type, 'figure');
  assert.equal(flow[0].imageIndex, 0);
});

test('position 命中段落关键词时插在该段之后', () => {
  const flow = buildArticleFlow(article(
    '先说便携，机身轻。\n再说屏幕，OLED 看得清。\n最后说接口，HDMI 够用。',
    [img('屏幕段落后')],
  ));
  assert.deepEqual(kinds(flow), ['P', 'P', 'F0', 'P']);
});

test('结尾位置的图排在正文之后', () => {
  const flow = buildArticleFlow(article('第一段\n第二段', [img('结尾行动引导')]));
  assert.deepEqual(kinds(flow), ['P', 'P', 'F0']);
});

test('开头位置的图排在导语之后、正文之前', () => {
  const flow = buildArticleFlow(article('第一段\n第二段', [img('开头后')]));
  assert.deepEqual(kinds(flow), ['F0', 'P', 'P']);
});

test('没有位置信息的图被分散到正文中间，不会全堆在末尾', () => {
  const body = Array.from({ length: 6 }, (_, i) => `第${i + 1}段正文`).join('\n');
  const flow = buildArticleFlow(article(body, [img(''), img(''), img('')]));
  const last = flow[kinds(flow).length - 1];
  assert.equal(last.type, 'para', '最后一块应是段落，而不是图片堆');
  const figurePositions = flow.map((b, i) => (b.type === 'figure' ? i : -1)).filter((i) => i >= 0);
  assert.equal(new Set(figurePositions).size, 3, '三张图应落在不同位置');
});

test('每张图都出现在流程中，不丢图', () => {
  const images = [img('封面'), img('body'), img('body'), img('结尾'), img('未知位置')];
  const flow = buildArticleFlow(article('一段\n二段\n三段', images));
  const seen = flow.filter((b) => b.type === 'figure').map((b) => b.imageIndex).sort();
  assert.deepEqual(seen, [0, 1, 2, 3, 4]);
});

test('没有正文时图片仍全部输出', () => {
  const flow = buildArticleFlow(article('', [img('body'), img('body')]));
  assert.equal(flow.filter((b) => b.type === 'figure').length, 2);
});

test('段落解析忽略空行', () => {
  assert.deepEqual(paragraphsOf('甲\n\n乙\n  \n丙'), ['甲', '乙', '丙']);
});

test('正文里的图片占位行（![主视觉](image_id:…)）不进段落，也不会留空段', () => {
  const body = ['先说便携。', '', '![主视觉](image_id:6afe9082b4ae278a15c46ccc57d0d6e92fecb7df48109252770f18d1cfa2bf19)', '', '再说屏幕。'].join('\n');
  assert.deepEqual(paragraphsOf(body), ['先说便携。', '再说屏幕。']);
  const flow = buildArticleFlow(article(body, [img('封面'), img('屏幕')]));
  assert.deepEqual(kinds(flow), ['F0', 'P', 'P', 'F1']);
  assert.ok(!JSON.stringify(flow).includes('image_id:'), '流程里不应残留图片编号');
});
