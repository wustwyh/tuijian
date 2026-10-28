import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {generationStore,generationApi} from './generations.mjs';

test('图片确认持久化通过状态，保留其他疑问及拦截项，重复确认不改变说明',()=>{
  const db=new DatabaseSync(':memory:');
  const store=generationStore({db,projectRoot:process.cwd(),store:{}});
  const id='00000000-0000-0000-0000-000000000001';
  const result={verification:{reviewed:true,overall_status:'pending',checks:[{type:'image',status:'pending',reason:'来源待补齐',action:'confirm'},{type:'fact',status:'pending',reason:'需确认型号配置',action:'confirm'},{type:'image',status:'rejected',reason:'型号不符',action:'revise'}],pending_questions:['请确认图片来源','请确认产品型号配置']}};
  db.prepare('INSERT INTO generations(id,created_at,status,summary,input,result) VALUES (?,?,?,?,?,?)').run(id,new Date().toISOString(),'succeeded','{}','{}',JSON.stringify(result));
  try{
    const first=store.confirmImages(id);
    assert.equal(first.result.verification.checks[0].status,'passed');
    assert.equal(first.result.verification.checks[1].status,'pending');
    assert.equal(first.result.verification.checks[2].status,'rejected');
    assert.equal(first.result.verification.overall_status,'rejected');
    assert.deepEqual(first.result.verification.pending_questions,['请确认产品型号配置']);
    assert.equal(store.confirmImages(id).result.verification.checks[0].reason,first.result.verification.checks[0].reason);
    const clean={verification:{checks:[{type:'image',status:'pending',reason:'来源'}],pending_questions:['请确认配图来源']}};
    db.prepare('UPDATE generations SET result=? WHERE id=?').run(JSON.stringify(clean),id);
    assert.equal(store.confirmImages(id).result.verification.overall_status,'passed');
    assert.ok(store.get(id).result.verification.imageSourceConfirmedAt);
  }finally{store.close();db.close();}
});

test('图片确认接口仅允许本站 POST',async()=>{
  let calls=0,response;const path='/api/generations/00000000-0000-0000-0000-000000000001/confirm-images';
  const store={generations:{confirmImages:()=>{calls++;return {status:'succeeded'};}}},json=(status,data)=>response={status,data};
  await generationApi({req:{method:'POST',headers:{host:'localhost',origin:'https://other.example'}},path,json,store});
  assert.equal(response.status,403);assert.equal(calls,0);
  await generationApi({req:{method:'GET',headers:{host:'localhost'}},path,json,store});
  assert.equal(response.status,405);
  await generationApi({req:{method:'POST',headers:{host:'localhost'}},path,json,store});
  assert.equal(response.status,200);assert.equal(calls,1);
});
