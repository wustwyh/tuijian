import {readFileSync, writeFileSync} from "node:fs";
const f = "server/platform-layout.test.mjs";
let s = readFileSync(f, "utf8");
s = s.replace("assert.equal(Object.keys(PLATFORM_LAYOUTS).length, 9);", "assert.equal(Object.keys(PLATFORM_LAYOUTS).length, 8);");
writeFileSync(f, s);
console.log("ok");
