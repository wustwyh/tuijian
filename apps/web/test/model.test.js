import test from 'node:test';
import assert from 'node:assert/strict';
import { safeSource, routeFromHash, taskRoute, verificationLabel, validateInput, emptyInput, formatTime } from '../src/model.js';

test('malformed hashes fall back to login while task IDs round trip', () => {
  assert.deepEqual(routeFromHash('#/tasks/%E0%A4%A'), { page: 'login' });
  assert.deepEqual(routeFromHash(taskRoute('fixture / 中文')), { page: 'workbench', id: 'fixture / 中文' });
  assert.deepEqual(routeFromHash('#/unknown'), { page: 'login' });
});
test('local paths and executable links cannot become evidence links', () => {
  for (const value of ['file:///E:/local.pdf', 'E:\\local.pdf', 'javascript:alert(1)', 'data:text/html,fixture', '/local/file', undefined]) assert.equal(safeSource(value), null);
  assert.equal(safeSource('https://example.com/source'), 'https://example.com/source');
});
test('unknown verification values never appear as passed; missing times are not epoch dates', () => {
  for (const status of [undefined, 'draft', 'new-backend-value']) assert.equal(verificationLabel(status), '待人工核验');
  for (const value of [undefined, null, '', 'bad date']) assert.equal(formatTime(value), '读取时间待确认');
});
test('creation rejects whitespace-only required fields and unsupported platform', () => {
  const errors = validateInput({ ...emptyInput, product_query: '  ', platform: 'unknown' });
  assert.ok(errors.product_query); assert.ok(errors.scenario); assert.ok(errors.goal); assert.ok(errors.platform);
  assert.deepEqual(validateInput({ ...emptyInput, product_query: 'fixture product', scenario: 'fixture scene', goal: 'fixture action' }), {});
});
