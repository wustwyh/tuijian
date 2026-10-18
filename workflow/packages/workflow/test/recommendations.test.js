import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflow } from '../src/index.js';
import { task, evidence, adapter } from './fixtures.js';

async function setup() {
  const workflow = createWorkflow({ llm: adapter() });
  const original = task({ audience_hint: '', scenario: '', goal: '', platform: undefined });
  const prepared = workflow.prepareRecommendedTask({ task: original });
  const input = { task: prepared.task, evidence: evidence() };
  const personaReport = await workflow.generatePersonas(input);
  const selection = workflow.recommendPersona({ ...input, personaReport });
  return { workflow, original, prepared, input, personaReport, selection };
}

test('zero-text preferences support four stages without faking human confirmation', async () => {
  const s = await setup();
  assert.equal(s.original.goal, '');
  assert.equal(s.prepared.task.goal, '引导到店体验');
  assert.equal(s.prepared.defaults_applied.length, 4);
  assert.equal(s.selection.source, 'system_recommended');
  const input = { ...s.input, personaReport: s.personaReport, selection: s.selection };
  const strategy = await s.workflow.generateStrategy(input);
  const draft = await s.workflow.generateContent({ ...input, strategy });
  const report = await s.workflow.verifyContent({ ...input, strategy, draft });
  assert.equal(s.personaReport.status, 'draft');
  assert.equal(draft.verification_status, 'draft');
  assert.equal(report.overall_status, 'pending');
  assert.ok(report.checks.some((check) => check.type === 'platform' && check.status === 'passed'));
  await assert.rejects(s.workflow.generateStrategy({ ...input, selection: undefined, personaName: s.selection.persona_name }), /确认/u);
});

test('changing brief, report, evidence or selection cannot reuse a recommendation', async () => {
  const s = await setup();
  const input = { ...s.input, personaReport: s.personaReport, selection: s.selection };
  for (const patch of [
    { task: { ...s.input.task, goal: '咨询了解' } },
    { personaReport: { ...s.personaReport, id: 'other' } },
    { evidence: s.input.evidence.map((item) => ({ ...item, verification_status: 'pending' })) },
    { selection: { ...s.selection, persona_name: '不存在' } },
    { selection: { ...s.selection, source: 'confirmed' } },
    { selection: { ...s.selection, context_key: 'old' } },
  ]) await assert.rejects(s.workflow.generateStrategy({ ...input, ...patch }), /推荐选择/u);
});

test('user can choose another candidate without certifying marketing claims', async () => {
  const s = await setup();
  const name = s.personaReport.personas[1].name;
  const selection = s.workflow.recommendPersona({ ...s.input, personaReport: s.personaReport, personaName: name });
  assert.equal(selection.source, 'user_selected');
  const input = { ...s.input, personaReport: s.personaReport, selection };
  const strategy = await s.workflow.generateStrategy(input);
  assert.equal(strategy.primary_persona, name);
  await assert.rejects(s.workflow.generateStrategy({ ...input, personaName: s.personaReport.personas[0].name }), /不匹配/u);
  assert.equal(s.personaReport.status, 'draft');
});

test('recommendation defaults cannot resolve missing products or unsupported platforms', () => {
  const workflow = createWorkflow({ llm: adapter() });
  assert.throws(() => workflow.prepareRecommendedTask({ task: { id: 't' } }), /型号/u);
  assert.throws(() => workflow.prepareRecommendedTask({ task: task({ platform: 'store_poster' }) }), /支持/u);
  const prepared = workflow.prepareRecommendedTask({ task: task() });
  assert.deepEqual(prepared.defaults_applied, []);
});
