import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImaClient, DEMO_PRODUCT, KNOWLEDGE_BASE_NAME, inspectImage } from '../index.mjs';

// Synthetic fixtures exercise protocol/error/security behavior, never the live data path.
const png = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.write('IHDR', 12); png.writeUInt32BE(800, 16); png.writeUInt32BE(800, 20);
const env = { IMA_OPENAPI_CLIENTID: 'test-client', IMA_OPENAPI_APIKEY: 'test-secret' };
const info = [{ media_id: 'doc-synthetic', title: '02-HUAWEI MateBook 14（鸿蒙版）.md', media_type: 7 }, { media_id: 'img-synthetic', title: 'vmall_matebook-14-harmonyos_正面产品展示.png', media_type: 9 }, { media_id: 'other-synthetic', title: 'MateBook 14 酷睿 Ultra.md', media_type: 7 }];
const json = data => new Response(JSON.stringify({ code: 0, data }), { headers: { 'content-type': 'application/json' } });
function setup(options = {}) {
  const calls = [];
  const fetchImpl = async (url, request) => {
    calls.push({ url, ...request });
    if (options.override) { const override = await options.override(url, request, calls); if (override) return override; }
    const op = new URL(url).pathname.split('/').at(-1), body = request.body ? JSON.parse(request.body) : {};
    if (op === 'search_knowledge_base') return json({ info_list: [{ kb_id: 'kb-synthetic', kb_name: KNOWLEDGE_BASE_NAME }], is_end: true });
    if (op === 'get_knowledge_base') return json({ infos: { 'kb-synthetic': { name: KNOWLEDGE_BASE_NAME } } });
    if (op === 'search_knowledge') return json({ info_list: info, is_end: true });
    if (op === 'get_media_info') return json({ media_type: body.media_id === 'doc-synthetic' ? 7 : 9, url_info: { url: `https://skb.ima.myqcloud.com/${body.media_id}?sign=synthetic`, headers: { 'X-IMA-Sign': 'scoped-source-signature' } } });
    if (url.includes('/doc-synthetic?')) return new Response(`# ${DEMO_PRODUCT}\n\n产品发现卡；不是完整规格档案。\nhttps://consumer.huawei.com/cn/test/`, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
    if (url.includes('/img-synthetic?')) return new Response(png, { headers: { 'content-type': 'image/png' } });
    throw Error('Unexpected test request');
  };
  return { calls, client: createImaClient({ env, fetchImpl, ...options.clientOptions }) };
}

test('real protocol shapes normalize without persisting signed URLs or credentials', async () => {
  const { client, calls } = setup();
  const result = await client.retrieveProductEvidence({ query: 'MateBook 14', confirmedProduct: DEMO_PRODUCT });
  assert.equal(result.status, 'resolved'); assert.equal(result.evidence.length, 2);
  assert.equal(result.evidence[1].image_metadata.width, 800);
  assert(result.evidence.every(item => item.verification_status === 'pending' && !item.id && !item.task_id));
  assert(!JSON.stringify(result).includes('sign=synthetic')); assert(!JSON.stringify(result).includes(env.IMA_OPENAPI_APIKEY));
  for (const call of calls.filter(call => new URL(call.url).hostname !== 'ima.qq.com')) {
    assert.equal(call.headers['ima-openapi-clientid'], undefined); assert.equal(call.headers['ima-openapi-apikey'], undefined);
    assert.equal(call.headers['X-IMA-Sign'], 'scoped-source-signature'); assert.equal(call.redirect, 'error');
  }
});
test('ambiguous model never downloads another version', async () => {
  const { client, calls } = setup(); const result = await client.retrieveProductEvidence({ query: 'MateBook 14' });
  assert.equal(result.status, 'ambiguous'); assert.equal(result.candidates.length, 2);
  assert(!calls.some(call => call.url.includes('get_media_info')));
});
test('an unrelated query cannot resolve to the demo product', async () => {
  await assert.rejects(setup().client.retrieveProductEvidence({ query: 'MacBook Air', confirmedProduct: DEMO_PRODUCT }), { code: 'IMA_NO_RESULT' });
});
test('empty search fails explicitly without fabricated evidence', async () => {
  const { client } = setup({ override: url => url.endsWith('search_knowledge') ? json({ info_list: [], is_end: true }) : null });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14' }), { code: 'IMA_NO_RESULT' });
});
test('missing credentials fail before network', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ima-empty-'));
  const { client, calls } = setup({ clientOptions: { env: {}, configDir: dir } });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14' }), { code: 'IMA_AUTH_FAILED' }); assert.equal(calls.length, 0);
});
test('official skill credential files work without exposing values', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ima-config-')); writeFileSync(join(dir, 'client_id'), 'file-client'); writeFileSync(join(dir, 'api_key'), 'file-key');
  const { client, calls } = setup({ clientOptions: { env: {}, configDir: dir } });
  await client.retrieveProductEvidence({ query: 'MateBook 14' }); assert.equal(calls[0].headers['ima-openapi-clientid'], 'file-client');
});
test('business permission error is separate from transport failure and redacts secrets', async () => {
  const { client } = setup({ override: () => new Response(JSON.stringify({ code: 110030, msg: 'test-secret https://private.invalid/?sign=test' })) });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14' }), error => error.code === 'IMA_AUTH_FAILED' && !error.message.includes('test-secret') && !error.message.includes('https://'));
});
test('missing raw URL never uses a search snippet as the original', async () => {
  const { client } = setup({ override: url => url.endsWith('get_media_info') ? json({ media_type: 7 }) : null });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14 鸿蒙版' }), { code: 'IMA_FETCH_FAILED' });
});
test('unapproved download origin is blocked before fetching it', async () => {
  const { client, calls } = setup({ override: url => url.endsWith('get_media_info') ? json({ media_type: 7, url_info: { url: 'https://evil.invalid/a' } }) : null });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14 鸿蒙版' }), { code: 'IMA_FETCH_FAILED' });
  assert(!calls.some(call => call.url.includes('evil.invalid')));
});
test('mime/header and bytes must agree; zero dimensions are rejected', () => {
  assert.throws(() => inspectImage(png, 'image/jpeg'), { code: 'IMA_FETCH_FAILED' });
  assert.throws(() => inspectImage(Buffer.from('<html>error</html>'), 'image/png'), { code: 'IMA_FETCH_FAILED' });
  const empty = Buffer.from(png); empty.writeUInt32BE(0, 16); assert.throws(() => inspectImage(empty, 'image/png'), { code: 'IMA_FETCH_FAILED' });
});
test('repeated pagination cursor fails instead of silently truncating results', async () => {
  const { client } = setup({ override: url => url.endsWith('search_knowledge') ? json({ info_list: info, is_end: false, next_cursor: 'loop' }) : null });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14' }), { code: 'IMA_FETCH_FAILED' });
});
test('explicit foreign knowledge base is rejected', async () => {
  const { client } = setup({ override: url => url.endsWith('get_knowledge_base') ? json({ infos: { foreign: { name: 'Other' } } }) : null });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14', knowledgeBaseId: 'foreign' }), { code: 'VALIDATION_ERROR' });
});
test('14s / 14X / 14 Pro and unrelated harmony labels never become the target model', async () => {
  for (const title of ['HUAWEI MateBook 14s（鸿蒙版）.md', 'HUAWEI MateBook 14X harmonyos.md', 'HUAWEI MateBook 14 Pro（鸿蒙版）.md', 'HUAWEI MateBook 14 产品介绍与鸿蒙版生态.md']) {
    const { client, calls } = setup({ override: url => url.endsWith('search_knowledge') ? json({ info_list: [{ media_id: 'near-model', title, media_type: 7 }], is_end: true }) : null });
    await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14', confirmedProduct: DEMO_PRODUCT }), { code: 'IMA_NO_RESULT' });
    assert(!calls.some(call => call.url.endsWith('get_media_info')));
  }
});
test('proxy helper refreshes the scoped real image id and returns bytes without API credentials', async () => {
  const { client, calls } = setup();
  const result = await client.fetchProductImage({ knowledgeBaseId: 'kb-synthetic', mediaId: 'img-synthetic', confirmedProduct: DEMO_PRODUCT });
  assert(result.bytes.equals(png)); assert.equal(result.imageMetadata.width, 800);
  assert.equal(calls.find(call => call.url.includes('/img-synthetic?')).headers['ima-openapi-apikey'], undefined);
});
test('proxy helper rejects wrong media id and near-model title without downloading', async () => {
  const { client, calls } = setup();
  await assert.rejects(client.fetchProductImage({ knowledgeBaseId: 'kb-synthetic', mediaId: 'not-in-kb', confirmedProduct: DEMO_PRODUCT }), { code: 'IMA_NO_RESULT' });
  await assert.rejects(client.fetchProductImage({ mediaId: 'img-synthetic', confirmedProduct: 'MateBook 14s（鸿蒙版）' }), { code: 'VALIDATION_ERROR' });
  assert(!calls.some(call => call.url.endsWith('get_media_info')));
  const near = setup({ override: url => url.endsWith('search_knowledge') ? json({ info_list: [{ media_id: 'near-model', title: 'MateBook 14 Pro harmonyos.png', media_type: 9 }], is_end: true }) : null });
  await assert.rejects(near.client.fetchProductImage({ mediaId: 'near-model', confirmedProduct: DEMO_PRODUCT }), { code: 'IMA_NO_RESULT' });
  assert(!near.calls.some(call => call.url.endsWith('get_media_info')));
});
test('canonical project credentials take precedence over skill compatibility aliases', async () => {
  const { client, calls } = setup({ clientOptions: { env: { ...env, IMA_CLIENT_ID: 'alias-client', IMA_API_KEY: 'alias-secret' } } });
  await client.retrieveProductEvidence({ query: 'MateBook 14' });
  assert.equal(calls[0].headers['ima-openapi-clientid'], env.IMA_OPENAPI_CLIENTID);
  assert.equal(calls[0].headers['ima-openapi-apikey'], env.IMA_OPENAPI_APIKEY);
});
test('live search terminal page may omit both pagination fields', async () => {
  const { client } = setup({ override: url => url.endsWith('search_knowledge') ? json({ info_list: info }) : null });
  assert.equal((await client.retrieveProductEvidence({ query: 'MateBook 14', confirmedProduct: DEMO_PRODUCT })).status, 'resolved');
});
test('an explicit nonterminal page still requires a valid cursor', async () => {
  const { client } = setup({ override: url => url.endsWith('search_knowledge') ? json({ info_list: info, is_end: false }) : null });
  await assert.rejects(client.retrieveProductEvidence({ query: 'MateBook 14' }), { code: 'IMA_FETCH_FAILED' });
});
