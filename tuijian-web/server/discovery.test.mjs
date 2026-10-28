import test from 'node:test';
import assert from 'node:assert/strict';
import {cardKey,validateQuestion,validateQuestions,validateTurn,questionSimilarity,isRepeatedQuestion} from './discovery.mjs';

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

test('一次出题：缺省推荐项选中第一个，选项编号自动补齐',()=>{
  const [q]=validateQuestions({questions:[{question:'2. 换机时你最担心哪一步？',options:[{label:'资料搬丢'},{label:'不会用',recommended:true},{label:'太慢'}]}]},1,3);
  assert.equal(q.question,'换机时你最担心哪一步？');
  assert.deepEqual(q.options.map(o=>o.id),['opt1','opt2','opt3']);
  assert.equal(q.recommended,'opt2');
  assert.equal(q.allowSkip,true);
});

test('一次出题：少于两个选项或没有问题文本直接报错',()=>{
  assert.throws(()=>validateQuestions({questions:[{question:'题',options:[{label:'只有一个'}]}]},1,3),/至少 2 个选项/);
  assert.throws(()=>validateQuestions({questions:[{question:'',options:[{label:'A'},{label:'B'}]}]},1,3),/问题文本无效/);
  assert.throws(()=>validateQuestions({questions:[]},1,3),/至少要给/);
});

test('一轮只问一个问题，并带上「当前理解」',()=>{
  const turn=validateTurn({understanding:'你更在意通勤时的重量',questions:[{dimension:'用户场景',question:'你一天要背着它走多远？',options:[{label:'十分钟内'},{label:'半小时以上',recommended:true}]}]});
  assert.equal(turn.understanding,'你更在意通勤时的重量');
  assert.equal(turn.question.id,'q1');
  assert.equal(turn.question.recommended,'opt2');
  assert.equal(turn.question.question,'你一天要背着它走多远？');
  assert.equal(validateTurn({questions:[{question:'只问一句？',options:[{label:'A'},{label:'B'}]}]}).understanding,'');
});

test('重复提问能被识别（多轮里不许把同一件事再问一遍）',()=>{
  assert.ok(questionSimilarity('你主要在什么场景使用？','你平时主要在哪些场景用？')>0.55);
  assert.ok(questionSimilarity('你主要在什么场景使用？','预算大概多少？')<0.2);
  assert.equal(isRepeatedQuestion('你主要在什么场景使用？',['你平时主要在哪些场景用？']),true);
  assert.equal(isRepeatedQuestion('预算大概多少？',['你主要在什么场景使用？']),false);
  assert.equal(isRepeatedQuestion('换机时最怕什么？',['换机时最怕什么？']),true);
});
