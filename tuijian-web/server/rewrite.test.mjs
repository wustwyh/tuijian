import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCandidates, markersOf, numbersOf} from './rewrite.mjs';

const base = {allowedNumbers: new Set(['14', '2']), requiredMarkers: ['[f_3]'], maxLength: 4000};

test('改写守卫：正常候选保留，重复版本去重', () => {
  const {candidates} = validateCandidates({candidates: [{text: '这台14英寸电脑[f_3]更轻。'}, {text: '这台14英寸电脑[f_3]更轻。'}, {text: '2公斤以内[f_3]，拿着不累。'}]}, base);
  assert.equal(candidates.length, 2);
  assert.ok(candidates[0].includes('[f_3]'));
});

test('改写守卫：新出现的数字（编参数）直接拦截', () => {
  const {candidates} = validateCandidates({candidates: [{text: '续航18小时[f_3]。'}, {text: '这台14英寸电脑[f_3]更轻。'}]}, base);
  assert.equal(candidates.length, 1);
  assert.ok(!candidates[0].includes('18'));
});

test('改写守卫：丢失引用角标的候选被拦截', () => {
  const {candidates} = validateCandidates({candidates: [{text: '这台14英寸电脑更轻。'}, {text: '这台14英寸电脑[f_3]更轻。'}]}, base);
  assert.deepEqual(candidates, ['这台14英寸电脑[f_3]更轻。']);
});

test('改写守卫：全部不合格时报错而不是给空候选', () => {
  assert.throws(() => validateCandidates({candidates: [{text: '续航18小时[f_3]。'}]}, base), /拦截/);
  assert.throws(() => validateCandidates({candidates: []}, base), /没有返回可用文本/);
  assert.throws(() => validateCandidates({candidates: [{text: 'x'.repeat(5000) + '[f_3]'}]}, base), /拦截/);
});

test('提取数字与角标：角标里的编号不算数字', () => {
  assert.deepEqual([...numbersOf('14英寸[f_18]与2公斤')], ['14', '2']);
  assert.deepEqual(markersOf('A[f_3]B[f_18]'), ['[f_3]', '[f_18]']);
});

test('改写提示词明确禁止括号编辑说明', async () => {
  const {rewriteMessages} = await import('./rewrite.mjs');
  const system = rewriteMessages({platform: '公众号', product: 'X', title: 'T', body: 'B', target: '一段', scope: 'paragraph', instruction: 'casual', count: 3, keywords: ['更口语']})[0].content;
  assert.match(system, /括号注释/);
  assert.match(system, /已人工微调/);
});
