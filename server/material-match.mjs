import {nameKey} from './catalog-files.mjs';
const roles={
  '学生学习':['学生用户'],'高校学生':['学生用户'],'中小学生家庭':['学生用户'],
  '教育':['教师用户'],'高校教师':['教师用户'],'中小学教师':['教师用户'],
  '商务管理':['管理者'],'企业高管':['管理者'],'移动办公':['商务差旅用户'],
  '家庭换新':['旧机换新用户'],'家庭共享':['旧机换新用户'],'内容创作':['内容创作者'],
  '设计创意':['内容创作者'],'媒体编辑':['内容创作者'],'企业IT':['企业采购人'],
  '中小企业':['企业采购人'],'政企':['政企','企业采购人'],'政府机关':['政企','企业采购人'],
  '央国企':['政企','企业采购人'],'门店':['门店顾客','零售'],'零售门店':['门店顾客','零售'],
};
const platformNames={wechat:['微信公众号','公众号长图文'],news:['新闻稿'],zhihu:['知乎'],xhs:['小红书'],
  weibo:['微博'],store:['门店长图','门店海报'],moments:['朋友圈'],business:['企业采购方案']};
const taskWords={选型号:['型号','SKU','选型','配置'],看屏幕:['屏幕','显示','柔光'],比便携:['便携','差旅','轻薄'],
  查续航:['续航','电池','充电'],核软件:['软件','兼容','插件'],做协同:['协同','多设备'],
  迁资料:['迁移','备份','换机','换新'],用会议:['会议','投屏','摄像头'],找售后:['售后','服务','保修','故障']};
const topicWords={
  '新电脑到手后的基础设置':['新机','基础设置','开箱','首次开机'],
  '换机前的数据整理与迁移':['迁移','备份','换机'],
  '蓝牙与常用外设连接':['蓝牙','外设','鼠标','键盘连接'],
  '输入与触控板入门':['触控板','输入法','键盘操作'],
  '电池、充电与散热':['电池','充电','续航','散热'],
  '单个应用无法联网':['应用联网','网络权限','联网排查'],
  '如何选择服务方式':['服务方式','售后','送修'],
  '查询保修、备件与进度':['保修','备件','维修进度']
};
export function inferLinks(source,choices){
  const segments=source.split('/').map(s=>s.replace(/\.md$|\.txt$/i,''));
  return {
    productIds:choices.products.filter(p=>segments.some(s=>nameKey(s)===nameKey(p.dir))).map(p=>p.id),
    audienceIds:choices.audiences.filter(a=>[a.name,...roles[a.name]||[]].some(n=>segments.some(s=>s.includes(n)))).map(a=>a.id),
    platformIds:choices.platforms.filter(p=>(platformNames[p.id]||[]).some(n=>source.includes(n))).map(p=>p.id),
    tasks:choices.tasks.filter(t=>(taskWords[t]||[]).some(word=>source.includes(word))),
    topicIds:choices.topics.filter(t=>segments.some(s=>s===t.name)||(topicWords[t.name]||[]).some(word=>source.includes(word))).map(t=>t.id),
  };
}
export function matchMaterial(m,selection){
  const reasons=[];let score=0,incompatible=false;
  const links=[['productIds',selection.productId,'同型号',80],['audienceIds',selection.audienceId,'同客户场景',35],['platformIds',selection.platformId,'同平台',60]];
  for(const [key,id,label,weight]of links){
    if(m[key].length&&id){if(m[key].includes(id)){reasons.push(label);score+=weight;}else incompatible=true;}
  }
  if(m.tasks.includes(selection.task)){reasons.push(`适合“${selection.task}”`);score+=25;}
  if(m.topicIds.some(id=>selection.topicIds?.includes(id))){reasons.push('同选题');score+=25;}
  if(m.source.endsWith('话术事实边界.md')){reasons.push('表达边界');score+=40;}
  // 培训方法按任务调取；不因通用词就进入每一篇营销文章。
  if(m.category==='P5'&&!m.tasks.includes(selection.task))score=0;
  return {score:incompatible?0:score,reasons,incompatible};
}
