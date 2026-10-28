import {readFileSync, writeFileSync} from "node:fs";
for (const f of [".tmp/check-cmp-para.mjs", ".tmp/check-cmp-whole.mjs", ".tmp/check-cmp-layout.mjs", ".tmp/shoot-cmp.mjs", ".tmp/check-r11b.mjs", ".tmp/check-r11.mjs"]) {
  try {
    let s = readFileSync(f, "utf8");
    if (!s.includes("wb-tabbar")) {
      s = s.replace(/(await session\.evaluate\(`\[\.\.\.document\.querySelectorAll\('\.wb-scope button'\)\][^\n]*\n)/g,
        "$1  await sleep(500);\n  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);\n");
      s = s.replace(/(await session\.evaluate\(`document\.querySelector\('\.wb \.generated-article \.article-lead'\)\?\.click\(\)`\);\n)/g,
        "$1  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);\n");
      writeFileSync(f, s);
      console.log("patched", f);
    }
  } catch (e) { console.log("skip", f, e.message.slice(0, 40)); }
}
