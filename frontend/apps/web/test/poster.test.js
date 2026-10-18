import test from 'node:test';
import assert from 'node:assert/strict';
import { posterSvg } from '../src/poster.js';

test('creative SVG escapes editable text and contains no external product resource', () => {
  const svg = posterSvg({ title: '<script>alert(1)</script>', body: '<image href="https://example.com"/> & text', product: 'sample', cta: 'visit', platform: 'xiaohongshu' });
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));
  assert.ok(!svg.includes('<image'));
  assert.ok(svg.includes('草稿'));
  assert.ok(svg.includes('待核验'));
});
test('platforms have different finished canvas dimensions and long copy is bounded', () => {
  const input = { title: '长标题'.repeat(1000), body: '正文'.repeat(1000), cta: '到店', product: '示例产品' };
  const note = posterSvg({ ...input, platform: 'xiaohongshu' });
  const article = posterSvg({ ...input, platform: 'wechat_official' });
  assert.ok(note.includes('viewBox="0 0 720 960"'));
  assert.ok(article.includes('viewBox="0 0 960 540"'));
  assert.ok(note.length < 5000);
  assert.ok(note.includes('…'));
});
