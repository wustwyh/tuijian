import {readFileSync, writeFileSync} from "node:fs";
const f = "server/platform-layout.test.mjs";
let s = readFileSync(f, "utf8");
s = s.replace(`test('朋友圈不再有篇幅硬性核验', () => {
  const checks = hardChecks(draft({ title: '一句话', body: '短句'.repeat(200) }), { platform: { id: 'moments', name: '销售朋友圈' }, product: { fullName: 'X' }, images: [] }, []);
  const hit = checks.find((c) => c.type === 'platform' && /篇幅|字，请按/.test(c.reason));
  assert.equal(hit, undefined, '不应因为篇幅产生平台核验项');
});`,
`test('朋友圈不再有篇幅硬性核验（长文也不报）', () => {
  const checks = hardChecks(draft({ title: '一句话', body: '短句'.repeat(800) }), { platform: { id: 'moments', name: '销售朋友圈' }, product: { fullName: 'X' }, images: [] }, []);
  const hit = checks.find((c) => c.type === 'platform' && /篇幅|字，请按/.test(c.reason));
  assert.equal(hit, undefined, '不应因为篇幅产生平台核验项');
});`);
writeFileSync(f, s);
console.log("ok");
