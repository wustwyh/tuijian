import {parse} from "@babel/parser";
const cases = {
  a: "const x = <Fold count={`${job.input.materials.length} 份`}/>;",
  b: "const x = <Fold count={job.input.materials.length + ' 份'}/>;",
  c: "const x = <Fold count={`${a.b} 份`}>{list.map((m,i)=><details key={i}><summary>{m.a} · {m.b}</summary><p>{m.c}</p></details>)}</Fold>;",
  d: "const x = <Fold title=\"使用素材\" count={`${job.input.materials.length} 份`}>hi</Fold>;",
};
for (const [k, code] of Object.entries(cases)) {
  try { parse(code, {sourceType: "module", plugins: ["jsx"]}); console.log(k, "OK"); }
  catch (e) { console.log(k, "FAIL", e.message); }
}
