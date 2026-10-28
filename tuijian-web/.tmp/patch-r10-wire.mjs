import {readFileSync, writeFileSync} from "node:fs";

// STEPS 名称
let cj = readFileSync("src/compose.jsx", "utf8");
cj = cj.replace("{ key: 'topic', no: 4, label: '选题与要求', path: '/create/topic' },", "{ key: 'topic', no: 4, label: '选题', path: '/create/topic' },");
cj = cj.replace("{ key: 'discovery', no: 5, label: 'AI 提需求', path: '/create/discovery' },", "{ key: 'discovery', no: 5, label: '提需求', path: '/create/discovery' },");
writeFileSync("src/compose.jsx", cj);

// 生成请求带上选题名称与热点
let cs = readFileSync("src/pages/ComposeSheet.jsx", "utf8");
cs = cs.replace(
  "body:JSON.stringify({productId:c.product.id,audienceId:c.state.audienceId,platformId:c.platform.id,task:c.task,format:c.format,topicIds:c.selectedTopics.map(t=>t.id),extra:c.extra,materialIds:c.selectedMaterials.map(m=>m.id)})",
  "body:JSON.stringify({productId:c.product.id,audienceId:c.state.audienceId,platformId:c.platform.id,task:c.task,format:c.format,topicIds:c.selectedTopics.map(t=>t.id),topicLabels:c.topicLabels,hotTopics:c.hotTopics,extra:c.extra,materialIds:c.selectedMaterials.map(m=>m.id)})"
);
cs = cs.replace(
  `    { label: '选题', path: '/create/topic', value: c.topicNames.join('、'), fallback: '不限' },`,
  `    { label: '选题', path: '/create/topic', value: c.topicNames.join('、'), fallback: '不限' },
    { label: '借势热点', path: '/create/topic', value: c.hotTopics.map(t=>t.title).join('、'), fallback: '没用热点' },`
);
cs = cs.replace(
  `    { label: 'AI 提需求', path: '/create/discovery', value: c.extra ? '已梳理' : null, fallback: '还没聊', ai: true },
    { label: '其他要求', path: '/create/discovery', value: c.extra, fallback: '无' },`,
  `    { label: '提需求', path: '/create/discovery', value: c.extra ? '已填写' : null, fallback: '还没填', ai: true },`
);
writeFileSync("src/pages/ComposeSheet.jsx", cs);

// 服务端：换一批时跳过缓存
let ia = readFileSync("server/insights-api.mjs", "utf8");
ia = ia.replace("      const hit = cacheGet(key);\n      if (hit) { json(200, {...hit, cached: true}); return true; }",
  "      const hit = input?.refresh ? null : cacheGet(key);\n      if (hit) { json(200, {...hit, cached: true}); return true; }");
writeFileSync("server/insights-api.mjs", ia);
console.log("ok");
