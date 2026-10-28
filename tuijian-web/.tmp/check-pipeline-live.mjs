// 端到端跑一遍真实生成链路（只读数据库，不写生成记录），验证网关+密钥+我们的提示词与 JSON 校验能否走通。
// 用法：node .tmp/check-pipeline-live.mjs <历史任务id>
import {openProducts} from '../server/products.mjs';
import {generationContext} from '../server/generation-context.mjs';
import {revisionWorkflow} from '../server/revision-workflow.mjs';
import {deepseekConfig, callJson} from '../server/deepseek.mjs';

const root = process.cwd();
const store = openProducts(root);
const config = deepseekConfig(root);
// 用与页面一致的请求结构：productId / platformId / task / format / topicIds / materialIds
const input = {
  productId: process.argv[2] || '01-鸿蒙电脑/HUAWEI MateBook 14',
  platformId: process.argv[3] || 'wechat',
  task: process.argv[4] || '选型号',
  format: process.argv[5] || '问题清单',
  topicIds: process.argv[6] ? process.argv[6].split(',') : [],
  materialIds: [],
  extra: '',
};
console.log(`请求：${input.platformId}｜${input.productId}｜${input.task}/${input.format}｜模型 ${config.model}｜地址 ${config.baseUrl}`);

const context = generationContext(root, store, input);
console.log(`上下文就绪：事实 ${context.facts?.length ?? 0} 条，素材 ${context.materials?.length ?? 0} 份，图片 ${context.images?.length ?? 0} 张`);

const trace = [];
const started = Date.now();
const stages = [];
try {
  const out = await revisionWorkflow({
    context,
    call: (options) => callJson({...options, config, trace}),
    onProgress: (status) => { stages.push(status); process.stdout.write(`  [${status}]`); },
  });
  const article = out.draft.article;
  console.log(`\n完成：${((Date.now() - started) / 1000).toFixed(1)}s｜阶段 ${[...new Set(stages)].join(' → ')}`);
  console.log(`标题（${article.title.length} 字）：${article.title}`);
  console.log(`正文 ${article.body.replace(/\s/g, '').length} 字｜图 ${article.image_plan.length} 张｜标签 ${(article.tags || []).join('/')}`);
  console.log(`核验：${out.verification.overall_status}｜修订轮次：${(out.conversation || []).length}`);
  const models = [...new Set(trace.map((t) => t.model))];
  const attempts = trace.length;
  const failedValidations = trace.filter((t) => t.validationStatus === 'failed').length;
  console.log(`调用 ${attempts} 次｜模型 ${models.join(',')}｜格式失败 ${failedValidations} 次｜输出合计 ${trace.reduce((n, t) => n + (t.outputCharacters || 0), 0)} 字`);
  console.log('RESULT: PASS');
} catch (e) {
  console.log(`\n失败（${((Date.now() - started) / 1000).toFixed(1)}s）：${e.message}`);
  console.log('阶段：', [...new Set(stages)].join(' → ') || '（还没进入创作）');
  const last = trace.at(-1) || {};
  console.log('最后一次调用：', JSON.stringify({name: last.name, model: last.model, finishReason: last.finishReason, formatError: last.formatError, requestError: last.requestError}));
  console.log('RESULT: FAIL');
  process.exitCode = 1;
}
