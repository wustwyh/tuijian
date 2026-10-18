// Explicitly run to regenerate the structured integration example. No live services used.
import { writeFileSync } from 'node:fs';
import { createWorkflow } from '../src/index.js';
import { adapter, task, evidence } from './fixtures.js';

let sequence = 0;
const workflow = createWorkflow({ llm: adapter(), createId: (prefix) => `${prefix}_example_${++sequence}` });
const input = { task: task(), evidence: evidence() };
const personaReport = await workflow.generatePersonas(input);
personaReport.status = 'confirmed'; // Simulation only; production requires actual user confirmation.
const strategy = await workflow.generateStrategy({ ...input, personaReport, personaName: personaReport.personas[0].name });
const outputs = [];
for (const platform of ['xiaohongshu', 'wechat_official']) {
  const current = { ...input, task: { ...input.task, platform }, personaReport, strategy };
  const draft = await workflow.generateContent(current);
  const verification = await workflow.verifyContent({ ...current, draft });
  outputs.push({ draft, verification });
}
writeFileSync(new URL('./example-output.json', import.meta.url), `${JSON.stringify({
  notice: 'SYNTHETIC TEST ONLY：不是线上 ima 证据，不是真实 LLM 输出或产品事实，不得进入正式运行链路。',
  ...input, personaReport, strategy, outputs,
}, null, 2)}\n`);
console.log('Generated test/example-output.json (synthetic test only).');
