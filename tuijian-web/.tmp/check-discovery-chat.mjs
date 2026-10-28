const base = 'http://localhost:5173';
const opts = await (await fetch(base + '/api/compose-options')).json();
const products = (await (await fetch(base + '/api/products')).json()).products;
const audiences = (await (await fetch(base + '/api/audiences')).json()).audiences;
const card = {
  productId: products[0].id,
  audienceId: audiences[0]?.id || null,
  platformId: 'xhs',
  task: opts.tasks[0],
  format: opts.formats[0],
  topicIds: [opts.topics[0].id],
  materialIds: [],
  extra: '',
};
const post = async (path, body) => {
  const r = await fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'failed');
  return d;
};
const t0 = Date.now();
const started = await post('/api/generations/discovery/start', card);
console.log(`第一问 (${Math.round((Date.now() - t0) / 1000)}s) · ${started.question.dimension}：${started.question.question}`);
console.log('  理解:', started.understanding || '(无)');
console.log('  选项:', started.question.options.map(o => o.label + (o.id === started.question.recommended ? '★' : '')).join(' / '));

let current = started.question;
const asked = [current.question];
for (let round = 2; round <= 5; round++) {
  const a = await post('/api/generations/discovery/answer', {
    sessionId: started.sessionId, cardKey: started.cardKey,
    questionId: current.id, optionId: current.options[1]?.id || current.recommended,
  });
  current = a.question;
  asked.push(current.question);
  console.log(`第${round}问 (${Math.round((Date.now() - t0) / 1000)}s) · ${current.dimension}：${current.question}`);
  console.log('  理解:', a.understanding || '(无)', '｜已覆盖:', (a.covered || []).join('、'));
}
const unique = new Set(asked.map(t => t.replace(/[？?。！!]/g, '')));
console.log('问题数', asked.length, '去重后', unique.size, unique.size === asked.length ? '（无重复 ✓）' : '（有重复 ✗）');

const done = await post('/api/generations/discovery/answer', {
  sessionId: started.sessionId, cardKey: started.cardKey, questionId: current.id, skip: true, finish: true,
});
console.log(`摘要 (${Math.round((Date.now() - t0) / 1000)}s，${done.rounds} 轮):`, done.extraSummary.slice(0, 120) + '…');
