import {readFileSync} from 'node:fs';
import {relative,join} from 'node:path';
import {createHash} from 'node:crypto';
import {files} from './catalog-files.mjs';
import {recommendFor} from '../src/audiences.js';
import {composeOptions} from './compose-options.mjs';
import {knowledgeRoot} from './knowledge-root.mjs';
export const fail=(status,message)=>Object.assign(new Error(message),{status});
const platformTemplates={wechat:'微信公众号图文模板.md',news:'新闻稿图文模板.md',zhihu:'知乎图文模板.md',xhs:'小红书图文模板.md',weibo:'微博图文模板.md',store:'门店海报图文模板.md',moments:'销售朋友圈模板.md',business:'企业采购方案模板.md'};
const words={选型号:['型号','选型','配置'],看屏幕:['屏幕','显示','柔光'],比便携:['便携','轻薄','移动办公'],查续航:['续航','电池','充电'],核软件:['软件','兼容','应用'],做协同:['协同','多屏','跨设备'],迁资料:['迁移','备份','换机'],用会议:['会议','投屏','音频'],找售后:['售后','保修','服务']};
export function generationContext(projectRoot,store,input){
  const root=knowledgeRoot(projectRoot),options=composeOptions(projectRoot);
  if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'请选择本次卡片');
  const product=store.list().find(p=>p.id===input.productId);
  if(!product)throw fail(400,'请选择有效产品');
  const audience=input.audienceId?store.audiences.list().find(a=>a.id===input.audienceId):recommendFor(product,store.audiences.list())[0];
  const platform=options.platforms.find(p=>p.id===input.platformId);
  if(!audience||!platform||!options.tasks.includes(input.task)||!options.formats.includes(input.format))throw fail(400,'客户、平台或任务已变化，请重新选择');
  if(!Array.isArray(input.topicIds)||input.topicIds.length>8)throw fail(400,'请重新选择有效选题');
  // 选题现在由 AI 按客户/平台现推，id 可能是 rec-1 这种；名称由前端带回来。
  const topicLabels=(input.topicLabels&&typeof input.topicLabels==='object'&&!Array.isArray(input.topicLabels))?input.topicLabels:{};
  const topics=input.topicIds.map(id=>options.topics.find(t=>t.id===id)||(topicLabels[id]?{id,name:String(topicLabels[id]).slice(0,40),desc:'',guide:'',source:'AI 推荐选题'}:null));
  if(topics.some(t=>!t))throw fail(400,'请重新选择有效选题');
  const hotTopics=Array.isArray(input.hotTopics)?input.hotTopics.slice(0,3).map(t=>({title:String(t?.title||'').slice(0,40),angle:String(t?.angle||'').slice(0,80),when:String(t?.when||'').slice(0,20)})).filter(t=>t.title):[];
  if(!Array.isArray(input.materialIds)||input.materialIds.length>16||new Set(input.materialIds).size!==input.materialIds.length)throw fail(400,'每次最多使用16份不同素材，请调整本次素材');
  if(typeof input.extra!=='string'||input.extra.length>6000)throw fail(400,'其他要求最多6000字');
  const current=store.materials.list();
  const materials=input.materialIds.map(id=>{const m=current.find(m=>m.id===id&&m.enabled);if(!m)throw fail(409,'本次素材已停用或移除，请返回重新选择');return store.materials.details(id);});
  const keywords=[...(words[input.task]||[]),...topics.map(t=>t.name),...hotTopics.map(t=>t.title)];
  const harmony=product.id.startsWith('01-');
  const faq=files(join(root,'P7-常见问题库')).filter(p=>p.endsWith('.md')).map(path=>({path,name:relative(root,path).replaceAll('\\','/')}))
    .filter(d=>!(harmony?/Windows/i:/鸿蒙|HarmonyOS/i).test(d.name)).map(d=>({...d,score:keywords.reduce((n,w)=>n+(d.name.includes(w)?1:0),0)})).filter(d=>d.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,3);
  const documents=[...store.details(product.id).documents.filter(d=>d.kind==='document').map(d=>({source:`P1-产品参数库/${d.source}`,content:d.content})),...faq.map(d=>({source:d.name,content:readFileSync(d.path,'utf8')}))];
  if(documents.reduce((n,d)=>n+d.content.length,0)>120000)throw fail(400,'相关事实资料过长，请先整理产品文档');
  let sequence=0;
  const facts=documents.flatMap(d=>d.content.split(/(?=^#{1,3} )/m).filter(t=>t.trim()&&t.replace(/^#+[^\n]*\n/,'').trim()).map(text=>({fact_id:`f_${++sequence}`,source:d.source,source_title:d.source.split('/').pop(),original_snippet:text,urls:[...new Set([...(text.match(/https?:\/\/[^\s)）>]+/g)||[]),...(d.content.match(/https?:\/\/[^\s)）>]+/g)||[])])],recorded_date:d.content.match(/(?:抓取日期|核验日期)[：:]\s*(\d{4}-\d{2}-\d{2})/)?.[1]||'原文未标注',version:d.content.match(/HarmonyOS[ \d.]+|Windows[ \d]+/)?.[0]?.trim()||'以具体SKU与实际系统版本为准'})));
  if(!facts.length)throw fail(422,'产品没有可用事实原文，请先补充资料');
  const rules=files(join(root,'00-建库规范/06-智能体规则')).filter(p=>p.endsWith('.md')).sort().map(path=>({source:relative(root,path).replaceAll('\\','/'),content:readFileSync(path,'utf8')}));
  const templateSource='P6-营销素材库/02-平台模板/'+platformTemplates[platform.id];
  const platformGuides=[{source:templateSource,content:readFileSync(join(root,templateSource),'utf8')}];
  const audienceDocuments=store.audiences.details(audience.id).documents;
  const selectedTopics=topics;
  const images=[...product.images].sort((a,b)=>Number(b.id===product.coverId)-Number(a.id===product.coverId));
  const referenceCharacters=materials.reduce((n,m)=>n+m.content.length,0);
  if(referenceCharacters>120000)throw fail(400,'素材原文合计超过12万字，请减少本次素材');
  return {createdAt:new Date().toISOString(),product,audience,audienceAuto:!input.audienceId,platform,task:input.task,format:input.format,topics:selectedTopics,hotTopics,extra:input.extra.trim(),facts,documents,rules,audienceDocuments,platformGuides,materials,images,
    versions:documents.map(d=>({source:d.source,sha256:createHash('sha256').update(d.content).digest('hex')}))};
}
