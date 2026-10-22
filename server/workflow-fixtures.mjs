export function fixture(){
  const fact={fact_id:'f_1',source:'P1/产品事实.md',source_title:'产品事实.md',original_snippet:'## 屏幕\n本型号屏幕支持触控；具体配置以所选SKU为准。',urls:[],version:'按SKU',recorded_date:'2026-10-21'};
  const context={product:{id:'p',fullName:'测试产品'},audience:{id:'a',name:'政企'},audienceAuto:false,platform:{id:'xhs',name:'小红书'},task:'看屏幕',format:'问题清单',topics:[],extra:'',facts:[fact],documents:[{source:fact.source,content:fact.original_snippet}],rules:[],platformGuides:[],audienceDocuments:[],materials:[],images:[{id:'im_1',productId:'p',file:'原图.jpg',description:'笔记本正面外观',url:'/api/product-images/im_1',ima:{entryId:'entry_1',mediaId:'media_1',fetchedAt:'2026-10-20',productId:'p'}}]};
  const scene={persona:'政企',inferred:false,usage_scenarios:['采购前比较'],buying_stage:'compare',main_problem:'屏幕选择',core_conflict:'需求与配置',content_goal:'帮助比较',selling_order:['使用需求','屏幕能力'],questions:[],reasoning:'依据客户背景'};
  const plan={scene,goal:'帮助比较',angle:'屏幕选择',outline:['需求','能力','建议'],style:'自然短段落',selected_facts:[{fact_id:'f_1',group:'屏幕'}],boundaries:['保留SKU条件'],pending:[],image_ids:['im_1'],references:[]};
  const article={title:'屏幕怎么选',title_options:[],lead:'从日常需求出发',body:'本型号屏幕支持触控，具体配置以所选SKU为准[f_1]。',cta:'核对所选配置',tags:[],image_plan:[{image_id:'im_1',position:'开头后',purpose:'展示产品外观',caption:'产品正面外观'}],claim_citations:[]};
  function review(status='passed',action=status==='passed'?'none':'revise'){
    return {checks:[{citation_id:'c_1',type:'fact',claim:'原句由程序回填',status,fact_id:'f_1',reason:status==='passed'?'原文支持':'请缩小适用范围',action},...['image','compliance','platform'].map(type=>({citation_id:null,type,claim:'对应检查',status:'passed',fact_id:null,reason:'符合要求',action:'none'}))],overall_status:status,pending_questions:[]};
  }
  return {context,plan,article,review};
}
