import test from 'node:test';
import assert from 'node:assert/strict';
import { context } from '../src/guards.js';
import { requestFor } from '../src/prompts.js';
import { task, evidence } from './fixtures.js';

const data = request => JSON.parse(request.prompt.slice(request.prompt.indexOf('\n{') + 1));
test('persona and strategy see fact evidence while content and review retain image evidence', () => {
  const items=evidence(3);
  items.push({...items[0],id:'ev_empty',media_id:'EMPTY',fact_excerpt:''});
  const ctx=context(task(),items);
  for (const stage of ['personas','strategy']) {
    const request=requestFor(stage,ctx);
    assert.deepEqual(data(request).evidence.map(e=>e.id),['ev_fact']);
  }
  for (const stage of ['content','verify']) {
    const request=requestFor(stage,ctx);
    assert.equal(data(request).evidence.filter(e=>e.media_type==='IMG').length,3);
  }
});
