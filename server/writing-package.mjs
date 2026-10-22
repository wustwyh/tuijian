import {fail} from './generation-context.mjs';

const keywords={选型号:['型号','配置','限制','适用'],看屏幕:['屏幕','显示','柔光'],比便携:['重量','轻薄','便携'],查续航:['电池','续航','充电'],核软件:['软件','系统','兼容'],做协同:['协同','文件','设备'],迁资料:['迁移','备份'],用会议:['会议','投屏','音频'],找售后:['售后','保修','服务']};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function rank(items,terms,content){
  return items.map((item,index)=>({item,index,score:terms.reduce((n,w)=>n+(content(item).includes(w)?1:0),0)}))
    .sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);
}
// 整段选取，绝不截断事实、表格行或其适用条件。
function pack(items,budget,content){
  let used=0;const kept=[],omitted=[],seen=new Set();
  for(const item of items){const value=content(item),key=clean(value);if(!key||seen.has(key)){omitted.push(item);continue;}
    seen.add(key);const size=JSON.stringify(item).length;
    if(used+size>budget){omitted.push(item);continue;}kept.push(item);used+=size;
  }return {kept,omitted,characters:used};
}
function referenceSections(items){
  return items.flatMap(item=>String(item.content||'').split(/(?=^#{1,3} )/m).filter(s=>s.trim()).map((content,index)=>({...item,section:index+1,content})));
}
export function imageEvidence(image,product){
  const ima=image.ima||{};
  const entry=ima.entryId||image.imaEntryId||'',media=ima.mediaId||image.imaMediaId||'';
  const fetchedAt=ima.fetchedAt||image.imaFetchedAt||'';
  const declaredProduct=ima.productId||image.productId||'';
  const modelMatches=declaredProduct===product.id;
  const validDate=/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(fetchedAt)&&!Number.isNaN(Date.parse(fetchedAt))&&new Date(fetchedAt).toISOString().startsWith(fetchedAt.slice(0,10));
  const confirmed=Boolean((entry||media)&&validDate&&modelMatches);
  const missing=[...(!modelMatches?['型号归属']:[]),...(!entry&&!media?['ima条目或媒体标识']:[]),...(!validDate?['ima获取时间']:[])];
  return {...image,productId:declaredProduct,provenance:{kind:'product',source:confirmed?'ima':'local',entryId:entry,mediaId:media,fetchedAt,confirmed,missing},description:image.description||''};
}
export function prepareWritingContext(context){
  const terms=[...(keywords[context.task]||[]),...(context.topics||[]).map(t=>t.name),context.task].filter(Boolean);
  const facts=pack(rank(context.facts,terms,f=>f.original_snippet),44000,f=>f.original_snippet);
  if(!facts.kept.length)throw fail(422,'没有可装入写作任务的完整事实片段，请拆分过长章节并保留适用条件后重试');
  const sourceMaterials=(context.materials||[]).map(m=>({material_id:m.material.id,name:m.material.name,source:m.material.source,category:m.material.category,content:m.content}));
  const sections=referenceSections(sourceMaterials);
  // 每份手选素材优先保留一个相关章节，其余章节再按相关性补充。
  const first=sourceMaterials.flatMap(m=>rank(sections.filter(s=>s.material_id===m.material_id),terms,s=>s.content).slice(0,1));
  const references=pack([...first,...rank(sections.filter(s=>!first.includes(s)),terms,s=>s.content)],18000,s=>s.content);
  const audience=pack(rank(referenceSections(context.audienceDocuments||[]),terms,d=>d.content),10000,d=>d.content);
  const images=(context.images||[]).slice(0,24).map(i=>imageEvidence(i,context.product));
  const omittedMaterials=sourceMaterials.filter(m=>!references.kept.some(s=>s.material_id===m.material_id)).map(m=>({id:m.material_id,name:m.name,reason:'整段资料超过输入预算'}));
  const selection={factTotal:context.facts.length,factSelected:facts.kept.length,factOmitted:facts.omitted.map(f=>f.fact_id),referenceTotal:sourceMaterials.length,referenceSelected:new Set(references.kept.map(m=>m.material_id)).size,omittedMaterials,referenceSectionsOmitted:references.omitted.length,audienceSectionsOmitted:audience.omitted.length,imageTotal:(context.images||[]).length,imageSelected:images.length,note:'按任务相关性选择完整章节；未入选资料保留在任务快照中。'};
  return {...context,facts:facts.kept,images,referenceSections:references.kept,audienceDocuments:audience.kept,selection};
}
export function taskInput(c){return {product:{id:c.product.id,name:c.product.fullName},audience:{id:c.audience.id,name:c.audience.name},audienceAuto:Boolean(c.audienceAuto),platform:c.platform,topics:c.topics||[],extra:c.extra||'',platformGuides:c.platformGuides||[]};}
// 规划阶段只需要挑选编号与分类，用节选压缩输入，避免整份参考资料挤占上下文导致输出截断；成稿阶段仍回填完整原文。
const excerpt=(value,max)=>{const text=clean(value);return text.length<=max?text:text.slice(0,max)+'…（后续省略）';};
function headingsOf(content,max=10){
  return String(content||'').split(/\r?\n/).filter(l=>/^#{1,3}\s+/.test(l)).map(l=>l.replace(/^#+\s*/,'').trim().slice(0,40)).filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,max);
}
export function planningEvidence(context){
  const materials=new Map();
  for(const section of context.referenceSections){
    const id=section.material_id;
    if(!materials.has(id))materials.set(id,{material_id:id,name:section.name,category:section.category,sections:0,headings:[],excerpt:''});
    const entry=materials.get(id);entry.sections++;
    for(const heading of headingsOf(section.content))if(entry.headings.length<10&&!entry.headings.includes(heading))entry.headings.push(heading);
    if(!entry.excerpt)entry.excerpt=excerpt(section.content,240);
  }
  const audience=new Map();
  for(const document of context.audienceDocuments){
    const key=document.name||'客户资料';
    if(!audience.has(key))audience.set(key,{name:key,sections:0,headings:[],excerpt:''});
    const entry=audience.get(key);entry.sections++;
    for(const heading of headingsOf(document.content))if(entry.headings.length<6&&!entry.headings.includes(heading))entry.headings.push(heading);
    if(!entry.excerpt)entry.excerpt=excerpt(document.content,200);
  }
  return {
    facts:context.facts.map(({urls,...f})=>({fact_id:f.fact_id,group:f.group,source:f.source,excerpt:excerpt(f.original_snippet,300),originalCharacters:String(f.original_snippet||'').length})),
    referenceMaterials:[...materials.values()],
    audienceMaterials:[...audience.values()],
    evidenceNote:'以上为节选，仅用于判断相关性与挑选编号；成稿阶段会回填完整原文，不得据节选补写未展示的条件。'
  };
}
export function promptImages(images){return images.map(i=>({image_id:i.id,description:i.description,file:i.file,provenance:i.provenance}));}
export function packageEvidence(context,plan){
  return plan.selected_facts.map(b=>({...context.facts.find(f=>f.fact_id===b.fact_id),group:b.group,model_name:context.product.fullName}));
}
export function reviewContext(context,basis){
  const ids=new Set(basis.map(f=>f.fact_id));
  const related=[];
  for(let i=0;i<context.facts.length;i++)if(ids.has(context.facts[i].fact_id)){
    for(const index of [i-1,i,i+1]){const f=context.facts[index];if(f&&f.source===context.facts[i].source&&!related.includes(f))related.push(f);}
  }
  return pack([...basis,...related.filter(f=>!ids.has(f.fact_id))],64000,f=>f.original_snippet).kept;
}
