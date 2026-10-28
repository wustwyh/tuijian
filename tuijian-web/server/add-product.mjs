import {mkdirSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {PRODUCT_CATEGORIES} from './catalog.mjs';
import {nameKey} from './catalog-files.mjs';
const fail=message=>Object.assign(new Error(message),{status:400});
const csv=rows=>rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
export function addProduct(input,{sourceRoot,storage,products,sync,setCover}){
  if(!PRODUCT_CATEGORIES.includes(input.category))throw fail('请选择鸿蒙电脑或 Windows 笔记本');
  const name=typeof input.name==='string'?input.name.trim():'';
  if(!name||name.length>80||name.includes('\\')||/[<>:"/\|?*\x00-\x1f]/.test(name)||/[. ]$/.test(name)||/^\.+$/.test(name)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name))throw fail('请填写有效的产品名称，不能包含路径符号');
  if(products.some(p=>[p.fullName,p.dir].some(n=>nameKey(n)===nameKey(name))))throw Object.assign(new Error('已有同名产品，请管理现有产品资料'),{status:409});
  for(const key of ['facts','selling'])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>80000)throw fail('请填写产品参数和卖点与限制，每项最多8万字');
  if(typeof input.sourceUrl!=='string'||input.sourceUrl.length>2000)throw fail('请填写有效的资料来源链接');
  let source;try{source=new URL(input.sourceUrl);if(!['http:','https:'].includes(source.protocol))throw 0;}catch{throw fail('请填写有效的资料来源链接');}
  if(!Array.isArray(input.images)||!input.images.length||input.images.length>8)throw fail('请上传1至8张产品图片');
  if(!Number.isInteger(input.coverIndex)||input.coverIndex<0||input.coverIndex>=input.images.length)throw fail('请选择默认封面');
  let total=0;
  const images=input.images.map((image,i)=>{
    const match=image&&typeof image.data==='string'&&image.data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/);
    if(!match)throw fail('图片仅支持 PNG、JPEG 和 WebP');
    const bytes=Buffer.from(match[2],'base64');total+=bytes.length;
    const type=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpeg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;
    if(type!==match[1]||!bytes.length||bytes.length>3*1024*1024)throw fail('图片格式不符或单张超过3MB');
    return {bytes,file:`upload-${i+1}.${type==='jpeg'?'jpg':type}`,description:String(image.name || `产品图片${i+1}`).slice(0,150)};
  });
  if(total>12*1024*1024)throw fail('图片总大小不能超过12MB');
  const id=`${input.category}/${name}`,target=join(sourceRoot,id);
  if(dirname(resolve(target))!==resolve(sourceRoot,input.category))throw fail('产品目录不正确');
  if(existsSync(target))throw fail('该产品文件夹已存在，请更换名称');
  const stage=join(storage,'product-drafts',randomUUID());mkdirSync(join(stage,'images'),{recursive:true});
  const date=new Date().toISOString().slice(0,10);
  writeFileSync(join(stage,'产品事实.md'),`# ${name} - 产品事实\n\n> 用户录入，录入日期：${date}。发布前请核对资料来源和具体配置。\n\n${input.facts.trim()}\n`);
  writeFileSync(join(stage,'卖点与限制.md'),`# ${name}｜卖点与限制\n\n${input.selling.trim()}\n`);
  writeFileSync(join(stage,'来源清单.csv'),csv([['资料类型','标题','URL','来源机构','抓取日期'],['产品页',name,source.href,'用户填写',date]]));
  writeFileSync(join(stage,'图片索引.csv'),csv([['文件名','产品型号','来源页面','原始图片URL','官网图片说明','宽度','高度','建议用途'],...images.map(im=>[im.file,name,source.href,'',im.description,'','','用户上传，发布前核对型号与使用授权'])]));
  for(const im of images)writeFileSync(join(stage,'images',im.file),im.bytes);
  renameSync(stage,target);
  try{sync();const relative=`${id}/images/${images[input.coverIndex].file}`;setCover(id,createHash('sha256').update(relative).digest('hex'));}
  catch(error){
    renameSync(target,stage);sync();throw error;
  }
  return id;
}
