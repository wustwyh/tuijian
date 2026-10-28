import {readFileSync, writeFileSync} from "node:fs";

// 1) 平台规格：朋友圈篇幅放宽，去掉「必须 80–150」这类硬性说法
let pl = readFileSync("src/platform-layout.js", "utf8");
pl = pl.replace(`    bodyMin: 80,
    bodyMax: 150,
    imageMin: 1,
    imageMax: 3,
    tags: 'forbidden',
    rules: [
      '全文 80–150 字，只讲一个核心卖点',`,
`    bodyMin: 40,
    bodyMax: 600,
    imageMin: 1,
    imageMax: 3,
    tags: 'forbidden',
    rules: [
      '文案一般 100–300 字，够说清一个核心卖点就好，不要为了凑字数铺陈',`);
pl = pl.replace("  if (spec.id === 'moments') lines.push(`- 正文长度必须在 ${spec.bodyMin}–${spec.bodyMax} 字之间，超出即判为不合格`);\n", "");
pl = pl.replace("  // 画幅有限的平台（海报 620×820、朋友圈单卡）写超了会溢出，这里给出总字数红线。\n  if (spec.bodyMax <= 160) lines.push(`- 正文加行动引导合计不得超过 ${spec.bodyMax} 字，这是硬性上限，超出会被要求重写`);",
"  // 画幅有限的平台（海报 620×820）写超了会溢出，这里给出总字数红线；朋友圈不再设硬上限。\n  if (spec.id === 'store') lines.push(`- 正文加行动引导合计不得超过 ${spec.bodyMax} 字，超出会溢出画幅`);");
writeFileSync("src/platform-layout.js", pl);

// 2) 核验：删掉篇幅这一条
let gs = readFileSync("server/generation-schema.mjs", "utf8");
gs = gs.replace(`    const bodyLength=(a.body||'').replace(/\\s/g,'').length;
    if(spec.id==='moments'&&(bodyLength<spec.bodyMin||bodyLength>spec.bodyMax))
      revise(\`正文 \${bodyLength} 字\`,\`\${spec.label}要求正文 \${spec.bodyMin}–\${spec.bodyMax} 字，当前 \${bodyLength} 字，请按该平台篇幅重写。\`);
`, "");
writeFileSync("server/generation-schema.mjs", gs);

// 3) 预览/导出的折叠阈值放宽到 300，171 字不再被折叠
let pub = readFileSync("src/publish-html.js", "utf8");
pub = pub.replace("// 朋友圈文案：平台默认只显示 150 字左右，超出部分微信会折叠。\n// 这里按同样的规则处理——卡内只放前 150 字，剩余全文放进「展开全文」，点了能看全，不丢内容。",
"// 朋友圈文案：微信客户端会在 6 行左右折叠，这里给一个宽松阈值（300 字），\n// 只有真正很长的文案才折叠，剩余全文放进「展开全文」，点了能看全，不丢内容。");
pub = pub.replace("function momentText(article, limit = 150) {", "function momentText(article, limit = 300) {");
pub = pub.replace("const { shown, full, expanded, length } = momentText(a, 150);", "const { shown, full, expanded, length } = momentText(a, 300);");
pub = pub.replace("// 结果页预览复用同一份朋友圈文案规则（截断到 150 字 + 展开全文），两边不许各写一套。", "// 结果页预览复用同一份朋友圈文案规则（截断 + 展开全文），两边不许各写一套。");
writeFileSync("src/publish-html.js", pub);

// 4) 测试跟着改
let pt = readFileSync("server/platform-layout.test.mjs", "utf8");
pt = pt.replace("  assert.match(moments, /80–150 字/);", "  assert.match(moments, /100–300 字/);");
pt = pt.replace(/test\('朋友圈字数超限触发平台修订'[\s\S]*?\n\}\);\n\n/, `test('朋友圈不再有篇幅硬性核验', () => {
  const checks = hardChecks(draft({ title: '一句话', body: '短句'.repeat(200) }), { platform: { id: 'moments', name: '销售朋友圈' }, product: { fullName: 'X' }, images: [] }, []);
  const hit = checks.find((c) => c.type === 'platform' && /篇幅|字，请按/.test(c.reason));
  assert.equal(hit, undefined, '不应因为篇幅产生平台核验项');
});

`);
writeFileSync("server/platform-layout.test.mjs", pt);

let ph = readFileSync("server/publish-html.test.mjs", "utf8");
ph = ph.replace(`test('朋友圈卡内文本不超过 150 字', () => {
  const long = { body: Array.from({ length: 20 }, () => '常出差的人选本要先掂包轻不轻、屏够不够用。').join('\\n') };
  const out = html('moments', long, 3);
  const text = /<span class="text">([\\s\\S]*?)<\\/span>/.exec(out)[1].replace(/&quot;/g, '"');
  assert.ok(text.length <= 150, \`朋友圈文本 \${text.length} 字，超过 150\`);
});`,
`test('朋友圈卡内文本按 300 字折叠，短文案不截断', () => {
  const short = { body: '常出差的人选本要先掂包轻不轻、屏够不够用。'.repeat(3) };
  const shortText = /<span class="text">([\\s\\S]*?)<\\/span>/.exec(html('moments', short, 3))[1];
  assert.ok(!shortText.includes('…'), '三百字以内不应该折叠');
  const long = { body: Array.from({ length: 40 }, () => '常出差的人选本要先掂包轻不轻、屏够不够用。').join('\\n') };
  const text = /<span class="text">([\\s\\S]*?)<\\/span>/.exec(html('moments', long, 3))[1].replace(/&quot;/g, '"');
  assert.ok(text.length <= 300, \`朋友圈文本 \${text.length} 字，超过 300\`);
});`);
writeFileSync("server/publish-html.test.mjs", ph);
console.log("ok");
