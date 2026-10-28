import {readFileSync, writeFileSync} from "node:fs";
const f = ".tmp/check-r20.mjs";
let s = readFileSync(f, "utf8");
s = s.replace(`  console.log('步骤 2 标题:', await session.evaluate(\`document.querySelectorAll('.wb-step h4')[1]?.textContent.trim()\`));`,
`  await session.evaluate(\`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI')).click()\`);
  await sleep(800);
  console.log('步骤 2 标题:', await session.evaluate(\`document.querySelectorAll('.wb-step h4')[1]?.textContent.trim()\`));`);
writeFileSync(f, s);
console.log("ok");
