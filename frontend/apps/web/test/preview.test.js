import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentPreview, ExportEntry } from '../src/ContentPreview.js';

// Fixtures are only used in this test file, never in the running application.
const render = props => renderToStaticMarkup(React.createElement(ContentPreview, props));

test('preview preserves text and never executes generated HTML or assumes document URLs are image URLs', () => {
  const html = render({ contents: [{ id: 'test-only', platform: 'wechat_official',
    selected_title: '<img src=x onerror=alert(1)>', body: '<script>alert(1)</script>\n正文',
    image_plan: [{ position: 'cover', caption: '测试夹具图片', evidence_id: 'test-evidence', source_url: 'https://example.test/document' }],
  }] });
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('article-preview'));
  assert.ok(html.includes('test-evidence'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('src="https://example.test/document"'));
});

test('missing content and unknown verification states stay explicitly unresolved', () => {
  assert.ok(render({ contents: [] }).includes('成稿尚未生成'));
  const html = render({ contents: [{ platform: 'xiaohongshu', verification_status: 'unrecognized' }] });
  assert.ok(html.includes('note-preview'));
  assert.ok(html.includes('待人工核验'));
  assert.ok(html.includes('正文内容待确认'));
  assert.ok(html.includes('尚无配图方案'));
  assert.ok(!html.includes('已通过'));
});

test('export stays unavailable until the server contract is connected', () => {
  const html = renderToStaticMarkup(React.createElement(ExportEntry));
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
  assert.ok(html.includes('导出暂未接通'));
  assert.ok(!html.includes('download='));
  assert.ok(!html.includes('<a '));
});
