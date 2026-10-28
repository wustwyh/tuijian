import {readFileSync} from "node:fs";
import {parse} from "@babel/parser";
const lines = readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
const L = lines[159];
console.log("长度", L.length);
const wrap = "const x = <div>" + L.trim() + "</div>;";
try { parse(wrap, {sourceType: "module", plugins: ["jsx"]}); console.log("line160 OK"); }
catch (e) { console.log("line160 FAIL", e.message, e.loc && `${e.loc.line}:${e.loc.column}`); }
