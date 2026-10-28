import {readFileSync, writeFileSync} from "node:fs";
const f = ".tmp/check-panel.mjs";
let s = readFileSync(f, "utf8");
s = s.replace(`  // 1 提需求
  await session.evaluate(\`[...document.querySelectorAll('.wb-btn-soft')].find(b => b.textContent.includes('3 条改法')).click()\`);`,
`  // 等关键词加载完（选中段落时自动拉）再点提需求，避免按钮还在 busy
  await waitFor(\`document.querySelectorAll('.wb-chips .wb-chip').length >= 3 ? 1 : 0\`, 90);
  // 1 提需求
  console.log('按钮状态:', await session.evaluate(\`JSON.stringify([...document.querySelectorAll('.wb-btn-soft')].map(b => [b.textContent.trim(), b.disabled]))\`));
  await session.evaluate(\`[...document.querySelectorAll('.wb-btn-soft')].find(b => b.textContent.includes('3 条改法')).click()\`);`);
writeFileSync(f, s);
console.log("ok");
