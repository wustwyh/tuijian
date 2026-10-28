import {readFileSync, writeFileSync} from "node:fs";

// 1) 注册两个新接口
let p = readFileSync("server/products.mjs", "utf8");
if (!p.includes("insightsApi")) {
  p = p.replace("import {generationStore,generationApi} from './generations.mjs';", "import {generationStore,generationApi} from './generations.mjs';\nimport {insightsApi} from './insights-api.mjs';");
  p = p.replace("        if(await generationApi({req,path,json,store}))return;", "        if(await generationApi({req,path,json,store}))return;\n        if(await insightsApi({req,path,json,store,projectRoot}))return;");
  writeFileSync("server/products.mjs", p);
}

// 2) 生成上下文：允许 AI 推荐选题（自定义 id + 名称），并接收本次结合的热点
let g = readFileSync("server/generation-context.mjs", "utf8");
g = g.replace(
  "  if(!Array.isArray(input.topicIds)||input.topicIds.length>8||input.topicIds.some(id=>!options.topics.some(t=>t.id===id)))throw fail(400,'请重新选择有效选题');",
  `  if(!Array.isArray(input.topicIds)||input.topicIds.length>8)throw fail(400,'请重新选择有效选题');
  // 选题现在由 AI 按客户/平台现推，id 可能是 rec-1 这种；名称由前端带回来。
  const topicLabels=(input.topicLabels&&typeof input.topicLabels==='object'&&!Array.isArray(input.topicLabels))?input.topicLabels:{};
  const topics=input.topicIds.map(id=>options.topics.find(t=>t.id===id)||(topicLabels[id]?{id,name:String(topicLabels[id]).slice(0,40),desc:'',guide:'',source:'AI 推荐选题'}:null));
  if(topics.some(t=>!t))throw fail(400,'请重新选择有效选题');
  const hotTopics=Array.isArray(input.hotTopics)?input.hotTopics.slice(0,3).map(t=>({title:String(t?.title||'').slice(0,40),angle:String(t?.angle||'').slice(0,80),when:String(t?.when||'').slice(0,20)})).filter(t=>t.title):[];`
);
g = g.replace(
  "  const keywords=[...(words[input.task]||[]),...input.topicIds.map(id=>options.topics.find(t=>t.id===id).name)];",
  "  const keywords=[...(words[input.task]||[]),...topics.map(t=>t.name),...hotTopics.map(t=>t.title)];"
);
g = g.replace(
  "  const selectedTopics=options.topics.filter(t=>input.topicIds.includes(t.id));",
  "  const selectedTopics=topics;"
);
g = g.replace(
  "topics:selectedTopics,extra:input.extra.trim(),",
  "topics:selectedTopics,hotTopics,extra:input.extra.trim(),"
);
writeFileSync("server/generation-context.mjs", g);

// 3) 提示词里带上热点
let w = readFileSync("server/writing-package.mjs", "utf8");
w = w.replace(
  "export function taskInput(c){return {product:{id:c.product.id,name:c.product.fullName},audience:{id:c.audience.id,name:c.audience.name},audienceAuto:Boolean(c.audienceAuto),platform:c.platform,topics:c.topics||[],extra:c.extra||'',platformGuides:c.platformGuides||[]};}",
  "export function taskInput(c){return {product:{id:c.product.id,name:c.product.fullName},audience:{id:c.audience.id,name:c.audience.name},audienceAuto:Boolean(c.audienceAuto),platform:c.platform,topics:c.topics||[],hotTopics:c.hotTopics||[],extra:c.extra||'',platformGuides:c.platformGuides||[]};}"
);
writeFileSync("server/writing-package.mjs", w);

// 4) 规划阶段加一句热点约束
let gp = readFileSync("server/generation-prompts.mjs", "utf8");
gp = gp.replace(
  "输入extra是用户额外要求；",
  "输入extra是用户额外要求；输入hotTopics是本轮要借势的热点，只能当作话题切入点（开头或一个分节扣住它），不得编造活动价格、折扣力度、活动时间、平台政策或销量，没有把握就只借势不写细节；"
);
writeFileSync("server/generation-prompts.mjs", gp);
console.log("server wiring ok");
