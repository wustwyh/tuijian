import test from 'node:test';
import assert from 'node:assert/strict';
import {platformSpec, platformRulesText, PLATFORM_LAYOUTS} from '../src/platform-layout.js';
import {hardChecks} from './generation-schema.mjs';

const draft = (article) => ({ article: { title_options: [], lead: '', cta: '', tags: [], image_plan: [], claim_citations: [], ...article } });

test('平台可按 id 与中文名解析', () => {
  assert.equal(platformSpec('xhs').id, 'xhs');
  assert.equal(platformSpec({ name: '04-小红书' }).id, 'xhs');
  assert.equal(platformSpec({ name: '销售朋友圈' }).id, 'moments');
  assert.equal(platformSpec({ name: '门店长图' }).id, 'store');
  assert.equal(platformSpec('未知平台'), null);
  assert.equal(platformSpec(undefined), null);
});

test('所有平台都具备版式与结构字段', () => {
  assert.equal(Object.keys(PLATFORM_LAYOUTS).length, 8);
  for (const [id, spec] of Object.entries(PLATFORM_LAYOUTS)) {
    assert.ok(spec.layout, `${id} 缺少 layout`);
    assert.ok(spec.imageMax >= spec.imageMin, `${id} 图片区间非法`);
    assert.ok(Array.isArray(spec.rules) && spec.rules.length > 0, `${id} 缺少规则`);
  }
});

test('提示词包含平台专属硬性结构', () => {
  const xhs = platformRulesText({ id: 'xhs' });
  assert.match(xhs, /小红书/);
  assert.match(xhs, /话题标签/);
  const store = platformRulesText({ id: 'store' });
  assert.match(store, /12 字/);
  const moments = platformRulesText({ id: 'moments' });
  assert.match(moments, /100–300 字/);
  assert.equal(platformRulesText('未知平台'), '');
});

test('朋友圈不再有篇幅硬性核验（长文也不报）', () => {
  const checks = hardChecks(draft({ title: '一句话', body: '短句'.repeat(800) }), { platform: { id: 'moments', name: '销售朋友圈' }, product: { fullName: 'X' }, images: [] }, []);
  const hit = checks.find((c) => c.type === 'platform' && /篇幅|字，请按/.test(c.reason));
  assert.equal(hit, undefined, '不应因为篇幅产生平台核验项');
});

test('门店海报标题超长与配图超量被拦', () => {
  const context = { platform: { id: 'store', name: '门店长图' }, product: { fullName: 'X' }, images: [{ id: 'im_1' }, { id: 'im_2' }] };
  const article = draft({ title: '这是一个明显超过十二个字的门店海报主标题', body: '轻薄好带', image_plan: [{ image_id: 'im_1', caption: 'a', position: '主视觉', purpose: '外观' }, { image_id: 'im_2', caption: 'b', position: '副图', purpose: '细节' }] });
  const checks = hardChecks(article, context, []);
  assert.ok(checks.some((c) => c.type === 'platform' && /标题不超过 12 字/.test(c.reason)), '应拦标题超长');
  assert.ok(checks.some((c) => c.type === 'platform' && /不超过 1 张/.test(c.reason)), '应拦配图超量');
});

test('小红书缺话题标签与配图不足被拦', () => {
  const context = { platform: { id: 'xhs', name: '04-小红书' }, product: { fullName: 'X' }, images: [{ id: 'im_1' }, { id: 'im_2' }, { id: 'im_3' }] };
  const checks = hardChecks(draft({ title: '通勤轻一点', body: '正文', image_plan: [{ image_id: 'im_1', caption: 'a', position: '首图', purpose: '外观' }] }), context, []);
  assert.ok(checks.some((c) => c.type === 'platform' && /话题标签/.test(c.reason)), '应拦缺标签');
  assert.ok(checks.some((c) => c.type === 'platform' && /不少于 3 张/.test(c.reason)), '应拦配图不足');
});

test('候选图不足时不强制最低配图数量', () => {
  const context = { platform: { id: 'xhs', name: '04-小红书' }, product: { fullName: 'X' }, images: [{ id: 'im_1' }] };
  const checks = hardChecks(draft({ title: '通勤轻一点', body: '正文', tags: ['通勤'], image_plan: [{ image_id: 'im_1', caption: 'a', position: '首图', purpose: '外观' }] }), context, []);
  assert.equal(checks.some((c) => c.type === 'platform' && /不少于/.test(c.reason)), false);
});

test('朋友圈本身不要求标题与标签', () => {
  const checks = hardChecks(draft({ title: '', body: '轻薄机身放进包里几乎没重量，通勤路上打开就能继续写方案。想换机的可以到店里实际掂一掂，感受会更直观一些。', tags: ['x'] }), { platform: { id: 'moments', name: '销售朋友圈' }, product: { fullName: 'X' }, images: [{ id: 'im_1' }] }, []);
  assert.equal(checks.some((c) => c.type === 'platform' && /标题不超过/.test(c.reason)), false);
});
