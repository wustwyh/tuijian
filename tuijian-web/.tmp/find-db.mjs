import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {globSync} from "node:fs";
const files = globSync("data/*.db").concat(globSync(".data/*.db")).concat(globSync("*.db"));
console.log("db files:", files);
