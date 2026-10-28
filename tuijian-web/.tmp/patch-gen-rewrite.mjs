import {readFileSync, writeFileSync} from "node:fs";
const file = "server/generations.mjs";
let s = readFileSync(file, "utf8");
s = s.replace(
  "import {rewriteMessages, keywordMessages, validateKeywords, validateRequirement, validateCandidates, markersOf, numbersOf} from './rewrite.mjs';",
  "import {rewriteMessages, keywordMessages, requirementOptionMessages, analyzeMessages, validateKeywords, validateRequirement, validateRequirements, validateAnalysis, validateCandidates, markersOf, numbersOf} from './rewrite.mjs';"
);
const anchor = "    if(input?.mode==='keywords'){";
if (!s.includes(anchor)) throw new Error("找不到 keywords 分支");
const insert = `    // AI 主动提需求：返回几条可以直接点的需求，用户不必自己写。
    if(input?.mode==='requirements'){
      const value=await callJson({config,messages:requirementOptionMessages({platform:job.summary.platform,product:job.summary.product,blockKind:scope,text:source,scope}),validate:validateRequirements,signal:new AbortController().signal,trace:[],name:'AI 提需求'});
      return {scope,requirements:value};
    }
    // 分析用户随手写的一句话，拆成可执行的改写要求。
    if(input?.mode==='analyze'){
      const request=String(input?.request||'').slice(0,300);
      if(!request.trim())throw fail(400,'先写一句你想怎么改');
      const value=await callJson({config,messages:analyzeMessages({platform:job.summary.platform,product:job.summary.product,blockKind:scope,text:source,request}),validate:validateAnalysis,signal:new AbortController().signal,trace:[],name:'需求分析'});
      return {scope,analysis:value};
    }
`;
s = s.replace(anchor, insert + anchor);
writeFileSync(file, s);
console.log("generations ok");
