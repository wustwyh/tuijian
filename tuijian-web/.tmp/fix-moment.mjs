import {readFileSync, writeFileSync} from "node:fs";
const f = ".tmp/check-moment.mjs";
let s = readFileSync(f, "utf8");
s = s.replace("if (j.status === 'done' || j.status === 'failed')", "if (j.status === 'succeeded' || j.status === 'failed')");
s = s.replace("  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);\n  await sleep(3400);", "  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);\n  await sleep(3400);\n  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b => b.textContent.includes('电脑')).click()`);\n  await sleep(1500);");
writeFileSync(f, s);
console.log("ok");
