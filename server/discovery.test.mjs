import test from 'node:test';
import assert from 'node:assert/strict';
import {cardKey,validateQuestion} from './discovery.mjs';

test('卡片键稳定且不区分素材与选题顺序',()=>{
  const base={productId:'p',audienceId:'a',platformId:'xhs',task:'看屏幕',format:'问题清单',topicIds:['t1','t2'],materialIds:['m1','m2']};
  const swapped={...base,topicIds:['t2','t1'],materialIds:['m2','m1']};
  assert.equal(cardKey(base),cardKey(swapped));
  assert.equal(cardKey(base),cardKey(base));
});

test('卡片任一维度变化都会改变会话键',()=>{
  const base={productId:'p',audienceId:'a',platformId:'xhs',task:'看屏幕',format:'问题清单',topicIds:[],materialIds:[]};
  assert.notEqual(cardKey(base),cardKey({...base,platformId:'zhihu'}));
  assert.notEqual(cardKey(base),cardKey({...base,task:'比便携'}));
  assert.notEqual(cardKey(base),cardKey({...base,productId:'q'}));
});

test('提问校验：维度必须来自剩余集合，选项2到6个，布尔值容错归一化',()=>{
  const good={dimension:'用户场景',question:'你主要在什么场景使用？',options:[{id:'a',label:'课堂'},{id:'b',label:'宿舍'}],allowOther:true,allowSkip:true};
  assert.deepEqual(validateQuestion(good,['用户场景','首要目标']),good);
  assert.throws(()=>validateQuestion({...good,dimension:'已覆盖维度'},['用户场景']),/剩余维度/);
  assert.throws(()=>validateQuestion({...good,options:[{id:'a',label:'仅一个'}]},['用户场景']),/2到6个/);
  const stringBool=validateQuestion({...good,allowOther:'true',allowSkip:'false'},['用户场景']);
  assert.equal(stringBool.allowOther,true);
  assert.equal(stringBool.allowSkip,false);
});
