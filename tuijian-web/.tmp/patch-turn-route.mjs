import {readFileSync, writeFileSync} from "node:fs";
const f = "server/generations.mjs";
let s = readFileSync(f, "utf8");
const before = s;

s = s.replace(
"import {rewriteMessages,keywordMessages,requirementOptionMessages,analyzeMessages,validateKeywords,validateRequirement,validateRequirements,validateAnalysis,validateCandidates,markersOf,numbersOf} from './rewrite.mjs';",
"import {rewriteMessages,keywordMessages,requirementOptionMessages,analyzeMessages,requirementTurnMessages,validateRequirementTurn,validateKeywords,validateRequirement,validateRequirements,validateAnalysis,validateCandidates,markersOf,numbersOf} from './rewrite.mjs';");

s = s.replace(`  if(input?.mode==='analyze'){`,
`  if(input?.mode==='turn'){
    // 需求追问：一次问一个问题，用户点选项就行
    const seed=String(input?.seed||'').slice(0,200);
    const history=(Array.isArray(input?.history)?input.history:[]).slice(-6).map(m=>({role:m.role==='user'?'user':'assistant',content:String(m.content||'').slice(0,200)}));
    const round=history.filter(m=>m.role==='assistant').length;
    const value=await callJson({config,messages:requirementTurnMessages({platform:job.summary.platform,product:job.summary.product,blockKind:scope,text:source,seed,history,round}),validate:validateRequirementTurn,signal:new AbortController().signal,trace:[],name:'需求追问'});
    return {scope,...value};
  }
  if(input?.mode==='analyze'){`);
if (s === before) { console.log("NO MATCH"); process.exit(1); }
writeFileSync(f, s);
console.log("ok");
