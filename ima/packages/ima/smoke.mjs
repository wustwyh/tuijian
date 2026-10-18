import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createImaClient, DEMO_PRODUCT, ImaError } from './index.mjs';

if (!process.argv.includes('--live')) {
  console.error('使用 --live 才执行真实线上只读 smoke；离线检查运行 node --test packages/ima/test/client.test.mjs。');
  process.exitCode = 2;
} else {
  const runtime = resolve('.runtime', 'ima-latest');
  let sequence = 0;
  await mkdir(runtime, { recursive: true });
  const fetchImpl = async (url, options) => {
    const response = await fetch(url, options);
    // Raw responses and download bytes stay under ignored .runtime only.
    const copy = response.clone();
    const isApi = new URL(url).hostname === 'ima.qq.com';
    const name = isApi ? `${++sequence}-${new URL(url).pathname.split('/').at(-1)}.json` :
      (response.headers.get('content-type')?.startsWith('image/') ? 'product-image.bin' : 'product.md');
    await writeFile(resolve(runtime, name), Buffer.from(await copy.arrayBuffer()));
    return response;
  };
  const client = createImaClient({ fetchImpl });
  try {
    const result = await client.retrieveProductEvidence({ query: 'MateBook 14', needImages: true, confirmedProduct: DEMO_PRODUCT });
    assert.equal(result.status, 'resolved');
    const document = result.evidence.find(item => item.media_type === 'MARKDOWN');
    const image = result.evidence.find(item => item.media_type === 'IMG');
    assert(document?.fact_excerpt.includes('鸿蒙'));
    assert(image?.image_metadata.width > 0 && image.image_metadata.height > 0);
    assert(result.evidence.every(item => !('id' in item) && !('task_id' in item) && item.verification_status === 'pending'));
    const refreshedImage = await client.fetchProductImage({ knowledgeBaseId: result.knowledgeBaseId, mediaId: image.media_id, confirmedProduct: DEMO_PRODUCT });
    assert.equal(refreshedImage.imageMetadata.sha256, image.image_metadata.sha256);
    const ambiguous = await client.retrieveProductEvidence({ query: 'MateBook 14', needImages: true, knowledgeBaseId: result.knowledgeBaseId });
    assert.equal(ambiguous.status, 'ambiguous');
    const summary = {
      status: 'passed', live: true, fetched_at: new Date().toISOString(), product: result.product,
      knowledge_base_id: result.knowledgeBaseId,
      evidence: result.evidence.map(({ fact_excerpt, ...item }) => ({ ...item, ...(fact_excerpt ? { fact_excerpt: fact_excerpt.slice(0, 750) } : {}) })),
      ambiguous_candidates: ambiguous.candidates,
      image_refresh_proxy: { status: 'passed', sha256_matches_first_read: true, content_type: refreshedImage.contentType },
      warnings: result.warnings
    };
    await writeFile(resolve(runtime, 'sanitized-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(JSON.stringify(error instanceof ImaError ? error.toJSON() : { error: { code: 'SMOKE_ASSERTION_FAILED', message: '线上结果未满足 smoke 断言。' } }));
    process.exitCode = 1;
  }
}
