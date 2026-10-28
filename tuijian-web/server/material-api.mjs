import { sameOrigin } from './same-origin.mjs';
export async function materialApi({req,path,json,store}){
  if(!['/api/materials','/api/materials/details','/api/materials/recommend'].includes(path))return false;
  const id=new URL(req.url,'http://localhost').searchParams.get('id');
  if(req.method==='GET'&&path!=='/api/materials/recommend'){
    json(200,path.endsWith('/details')?store.materials.details(id):{materials:store.materials.list()});return true;
  }
  if(!['POST','PUT'].includes(req.method)||path.endsWith('/details')){json(405,{error:'操作方式不支持'});return true;}
  if (!sameOrigin(req)){json(403,{error:'请在本站保存素材'});return true;}
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>1024*1024){json(413,{error:'素材内容超过限制'});return true;}chunks.push(chunk);}
  let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(400,{error:'素材内容格式不正确'});return true;}
  if(!input||typeof input!=='object'){json(400,{error:'请填写素材内容'});return true;}
  if(path.endsWith('/recommend')){json(200,store.materials.recommend(input));return true;}
  if(req.method==='PUT'&&!id){json(400,{error:'请选择素材'});return true;}
  json(req.method==='POST'?201:200,store.materials.save(input,req.method==='PUT'?id:null));return true;
}
