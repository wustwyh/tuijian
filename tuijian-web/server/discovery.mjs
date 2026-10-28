import {randomUUID,createHash} from 'node:crypto';
import { sameOrigin } from './same-origin.mjs';
import {deepseekConfig,callJson} from './deepseek.mjs';
import {composeOptions} from './compose-options.mjs';
import {fail} from './generation-context.mjs';

// 需求梳理 v3：像对话一样，一次只问一个问题，下一题接着上一题的回答往下问。
// 用户随时可以停下来，把聊过的内容整理成一段「额外要求」。
const DIMENSIONS = ['用户场景', '首要目标', '核心疑虑或卖点', '行动与CTA', '购买或内容阶段'];
const TTL_MS = 30 * 60 * 1000;
const shapeError = message => fail(502, '需求梳理输出格式不合格：' + message);

export function cardKey(input) {
  const norm = arr => [...new Set(Array.isArray(arr) ? arr : [])].sort().join(',');
  return createHash('sha256').update(JSON.stringify({
    p: input.productId, a: input.audienceId || '', pf: input.platformId, t: input.task, f: input.format,
    tp: norm(input.topicIds), m: norm(input.materialIds),
  })).digest('hex');
}

const asBool = value => (value === undefined ? true : !(value === false || value === 0 || value === '0' || value === 'false' || value === '否'));

// 去掉标点与空白，用来判断是不是把同一件事又问了一遍。
export const questionKey = text => String(text || '').replace(/[\s，。！？、,.!?：:；;（）()「」【】"'’“”\-—…]+/g, '');

// 二元组 + 单字重叠：中文短句换个问法也能认出来，同时避免把不相关的问题判成重复。
export function questionSimilarity(a, b) {
  const sets = text => {
    const clean = questionKey(text);
    const bigrams = new Set();
    for (let i = 0; i < clean.length - 1; i++) bigrams.add(clean.slice(i, i + 2));
    if (!bigrams.size && clean) bigrams.add(clean);
    return {bigrams, chars: new Set(clean.split(''))};
  };
  const overlap = (x, y) => {
    if (!x.size || !y.size) return 0;
    let hit = 0;
    for (const item of x) if (y.has(item)) hit++;
    return hit / Math.min(x.size, y.size);
  };
  const x = sets(a), y = sets(b);
  return Math.max(overlap(x.bigrams, y.bigrams), overlap(x.chars, y.chars) * 0.8);
}

export const isRepeatedQuestion = (text, asked, threshold = 0.55) =>
  asked.some(prev => prev === text || questionSimilarity(prev, text) >= threshold);

// 逐题校验（保留给单题流程与测试用）
export function validateQuestion(v, remaining) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw shapeError('问题必须是JSON对象');
  if (!remaining.includes(v.dimension)) throw shapeError('dimension 必须是剩余维度之一：' + remaining.join('、'));
  if (typeof v.question !== 'string' || !v.question.trim() || v.question.length > 300) throw shapeError('question 应为简短文本');
  if (!Array.isArray(v.options) || v.options.length < 2) throw shapeError('options 应为2到6个选项');
  v.options = v.options.slice(0, 6).map((o, i) => {
    if (typeof o === 'string') return {id: 'opt' + (i + 1), label: o};
    if (!o || typeof o !== 'object') throw shapeError('选项格式无效');
    const label = String(o.label || o.text || o.option || o.value || '').trim();
    if (!label) throw shapeError('每个选项需含label');
    return {id: String(o.id || o.key || 'opt' + (i + 1)), label};
  });
  v.allowOther = asBool(v.allowOther);
  v.allowSkip = asBool(v.allowSkip);
  return v;
}

// 一次返回的一组问题：每题 3–5 个选项，且必须有“推荐”项（用户什么都不点也能直接去写）。
export function validateQuestions(value, min = 1, max = 1) {
  const list = Array.isArray(value?.questions) ? value.questions : Array.isArray(value) ? value : value?.question ? [value.question] : [];
  if (list.length < min) throw shapeError('一次至少要给 ' + min + ' 个问题');
  return list.slice(0, max).map((q, index) => {
    if (typeof q?.question !== 'string' || !q.question.trim() || q.question.length > 300) throw shapeError('问题文本无效');
    const raw = Array.isArray(q.options) ? q.options : [];
    const options = raw.slice(0, 5).map((o, j) => {
      const label = typeof o === 'string' ? o : String(o?.label || o?.text || '').trim();
      if (!label) throw shapeError('选项缺少文本');
      return {id: 'opt' + (j + 1), label: label.slice(0, 80)};
    });
    if (options.length < 2) throw shapeError('每题至少 2 个选项');
    const marked = raw.findIndex(o => o && typeof o === 'object' && o.recommended === true);
    const picked = Number.isInteger(q.recommended) ? q.recommended : marked;
    return {
      id: 'q' + (index + 1),
      dimension: String(q.dimension || '针对选题').slice(0, 40),
      question: q.question.trim().replace(/^[0-9]+[.、)]\s*/, ''),
      options,
      recommended: options[Math.max(0, Math.min(options.length - 1, picked < 0 ? 0 : picked))].id,
      allowSkip: asBool(q.allowSkip),
    };
  });
}

// 一轮对话：模型可以顺带给一句「我现在的理解」，主产出仍然只有一个问题。
export function validateTurn(value) {
  const [question] = validateQuestions(value, 1, 1);
  const raw = value?.understanding ?? value?.summary ?? value?.read;
  const understanding = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 160) : '';
  return {question, understanding};
}

export function discoveryStore({projectRoot,list,audiences,materials}) {
  const sessions = new Map();

  function buildCard(input) {
    const opts = composeOptions(projectRoot);
    const product = list().find(p => p.id === input.productId);
    if (!product) throw fail(400, '请选择有效产品');
    const audience = input.audienceId ? audiences.list().find(a => a.id === input.audienceId) : null;
    const platform = opts.platforms.find(p => p.id === input.platformId);
    if (!platform || !opts.tasks.includes(input.task) || !opts.formats.includes(input.format)) throw fail(400, '客户、平台或任务已变化，请重新选择');
    if (!Array.isArray(input.topicIds) || input.topicIds.some(id => !opts.topics.some(t => t.id === id))) throw fail(400, '请重新选择有效选题');
    if (!Array.isArray(input.materialIds)) throw fail(400, '素材选择无效');
    const topics = opts.topics.filter(t => input.topicIds.includes(t.id)).map(t => ({name: t.name, problem: t.desc || '', points: String(t.guide || '').slice(0, 500)}));
    const materialList = materials.list();
    const chosen = input.materialIds.map(id => { const m = materialList.find(x => x.id === id); if (!m) throw fail(409, '本次素材已停用或移除'); return {name: m.name, kind: m.kind}; });
    return {
      product: {id: product.id, name: product.fullName},
      audience: {id: audience?.id || '', name: audience?.name || '系统推荐客户'},
      audienceAuto: !input.audienceId,
      platform: {id: platform.id, name: platform.name},
      task: input.task, format: input.format, topics,
      materials: chosen,
      extra: typeof input.extra === 'string' ? input.extra.slice(0, 6000) : '',
    };
  }

  function prune() {
    const now = Date.now();
    for (const [id, s] of sessions) if (now - s.updatedAt > TTL_MS) sessions.delete(id);
    if (sessions.size > 200) { const oldest = [...sessions.values()].sort((a, b) => a.updatedAt - b.updatedAt).slice(0, sessions.size - 200); for (const s of oldest) sessions.delete(s.id); }
  }

  function nextMessages(session) {
    const asked = session.questions.map(q => q.question);
    const remaining = DIMENSIONS.filter(d => !session.covered.includes(d));
    const system = [
      '你是图文营销的“需求澄清”助手，正在和用户一问一答，把这次图文到底要怎么写问清楚。',
      '硬性要求：',
      '1) 每次只问一个问题（输出数组里只有一个元素），不要罗列多个问题；',
      '2) 这一问必须接着用户上一条回答往下问——他刚说了什么，就在那个点上再确认一层；如果是第一问，就从选题里的具体决策点切入；',
      '3) 题干里要出现具体场景或取舍，不要问“你的目标是什么”这类放之四海皆准的问题；',
      '4) 给 3–4 个互斥、可执行的大白话选项，并把最推荐的一个标成 recommended:true；',
      '5) 不要重复已经问过的角度，优先覆盖还没聊过的维度：' + (remaining.length ? remaining.join('、') : '都可以，但要更具体') + '；',
      '6) 已经问过的问题：' + (asked.length ? asked.join(' ／ ') : '（还没有）') + '；',
      '7) 不要问产品参数、价格、促销、库存这类资料里已有或不能编造的信息；',
      '8) 如果用户直接说了自己的想法，先用一句话复述你的理解，再问下一个更具体的问题。',
      '输出一个 JSON 对象：{"understanding":"一句话复述你对这次图文的当前理解（可省略）","questions":[{"dimension":"...","question":"...","options":[{"label":"...","recommended":true}]}]}，不要代码围栏。',
    ].join('\n');
    const user = {
      card: {
        product: session.card.product.name, audience: session.card.audience.name, audienceAuto: session.card.audienceAuto,
        platform: session.card.platform.name, task: session.card.task, format: session.card.format,
        topics: session.card.topics, materials: session.card.materials.map(m => m.name), existingExtra: session.card.extra,
      },
      dialogue: session.history,
      covered: session.covered,
      round: session.history.length + 1,
    };
    return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify(user)}];
  }

  function summaryMessages(session) {
    const system = '你是图文营销的“需求梳理”助手。把刚才这一轮问答整理成一段可以直接用作“额外要求”的摘要。' +
      '摘要要具体、可执行：写清这次选题下要突出的场景与痛点、卖点取舍、必须保留的适用条件、期望的行动引导与语气；' +
      '不要把问题清单本身当结论，也不要编造未确认的产品事实、价格或参数。只输出 {"extraSummary":"..."}，不要代码围栏。';
    const user = {
      card: {
        product: session.card.product.name, audience: session.card.audience.name, audienceAuto: session.card.audienceAuto,
        platform: session.card.platform.name, task: session.card.task, format: session.card.format,
        topics: session.card.topics, materials: session.card.materials.map(m => m.name), existingExtra: session.card.extra,
      },
      dialogue: session.history,
    };
    return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify(user)}];
  }

  function config() {
    const cfg = deepseekConfig(projectRoot);
    if (!cfg.key) throw fail(503, '请先在服务器后台密钥里配置模型 API Key（LLM_API_KEY），再梳理需求');
    return cfg;
  }

  // 生成下一问；如果模型换汤不换药地把旧问题又问一遍，再要一次。
  async function generateNext(session) {
    const cfg = config();
    const asked = session.questions.map(q => q.question);
    let last = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const value = await callJson({
        config: cfg, messages: nextMessages(session), validate: validateTurn,
        signal: new AbortController().signal, trace: [], name: attempt ? '需求澄清追问（重问）' : '需求澄清追问',
      });
      last = value;
      if (!isRepeatedQuestion(value.question.question, asked)) break;
      session.history.push({question: '（系统）上一问重复了，请换一个角度', answer: value.question.question});
    }
    const turn = last;
    const added = {...turn.question, id: 'q' + (++session.seq)};
    session.questions.push(added);
    session.updatedAt = Date.now();
    return {understanding: turn.understanding, question: added};
  }

  async function start(input) {
    prune();
    const card = buildCard(input);
    const session = {id: randomUUID(), key: cardKey(input), card, seq: 0, questions: [], covered: [], history: [], done: false, summary: '', createdAt: Date.now(), updatedAt: Date.now()};
    sessions.set(session.id, session);
    const first = await generateNext(session);
    return {sessionId: session.id, cardKey: session.key, understanding: first.understanding, question: first.question, round: 1};
  }

  async function answer({sessionId, answers, cardKey: key, finish = false, questionId, optionId, text, skip = false}) {
    const session = sessions.get(sessionId);
    if (!session) throw fail(404, '这一段对话已经过期，请重新开始');
    if (key && key !== session.key) throw fail(409, '本次组合已经变化，请重新梳理需求');
    if (session.done) throw fail(409, '这一轮已经整理完成，可以继续追问或重新开始');
    const picked = Array.isArray(answers) ? answers[0] : {questionId, optionId, text};
    const question = session.questions.find(q => q.id === picked?.questionId) || session.questions[session.questions.length - 1];
    if (!question) throw fail(400, '没有待回答的问题');
    if (!skip) {
      const option = question.options.find(o => o.id === picked?.optionId) || question.options.find(o => o.label === String(picked?.text || '').trim());
      const answerText = option ? option.label : typeof picked?.text === 'string' ? picked.text.trim().slice(0, 300) : '';
      if (!answerText) throw fail(400, '请选择一个选项，或直接说你的想法');
      session.history.push({question: question.question, answer: answerText, dimension: question.dimension});
      if (question.dimension && !session.covered.includes(question.dimension)) session.covered.push(question.dimension);
      session.updatedAt = Date.now();
    }
    const cfg = config();
    if (finish) {
      const {extraSummary} = await callJson({
        config: cfg, messages: summaryMessages(session),
        validate: v => { if (!v || typeof v.extraSummary !== 'string' || !v.extraSummary.trim() || v.extraSummary.length > 6000) throw shapeError('extraSummary 应为有效文本'); return v; },
        signal: new AbortController().signal, trace: [], name: '需求梳理摘要',
      });
      session.done = true; session.summary = extraSummary.trim(); session.updatedAt = Date.now();
      return {sessionId: session.id, cardKey: session.key, done: true, extraSummary: session.summary, rounds: session.history.length};
    }
    const next = await generateNext(session);
    return {sessionId: session.id, cardKey: session.key, done: false, understanding: next.understanding, question: next.question, rounds: session.history.length, covered: session.covered};
  }

  return {start, answer};
}

export async function discoveryApi({req,path,json,store}) {
  if (!path.startsWith('/api/generations/discovery/')) return false;
  if (req.method !== 'POST') { json(405, {error: '操作方式不支持'}); return true; }
  if (!sameOrigin(req)) { json(403, {error: '请在本站发起梳理'}); return true; }
  const suffix = path.slice('/api/generations/discovery'.length);
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 65536) { json(413, {error: '输入要求过长'}); return true; } chunks.push(chunk); }
  let input; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { json(400, {error: '梳理请求格式不正确'}); return true; }
  try {
    if (suffix === '/start') json(201, await store.discovery.start(input));
    else if (suffix === '/answer') json(200, await store.discovery.answer(input));
    else { json(404, {error: '梳理入口不存在'}); return true; }
  } catch (e) { json(e.status || 500, {error: e.status ? e.message : '需求梳理暂时不可用，请重试'}); }
  return true;
}
