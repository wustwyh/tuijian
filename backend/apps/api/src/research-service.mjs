import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { ApiError, invalid, notFound } from './errors.mjs';
import { createLLMOperation } from './llm-operation.mjs';

const DOWNSTREAM = ['personas', 'strategy', 'content', 'verification', 'persona_selection', 'strategy_selection'];
const conflict = (code, message) => new ApiError(409, code, message);
const ref = (item) => ({ id: item.id, version: item.version });
const current = (snapshot, kind) => snapshot.artifacts[kind]?.freshness === 'current' ? snapshot.artifacts[kind] : null;

function actionInput(body, allowed = []) {
  if (!body || Object.getPrototypeOf(body) !== Object.prototype || Object.keys(body).some((key) => !['expected_revision', 'operation_key', ...allowed].includes(key))) throw invalid('操作请求字段无效');
  if (!Number.isSafeInteger(body.expected_revision) || body.expected_revision < 1) throw invalid('expected_revision 必须为正整数');
  return body;
}

function safeError(error) {
  if (error instanceof ApiError) return error;
  const messages = {
    IMA_NO_RESULT: [404, '线上知识库没有可用的对应型号资料'],
    IMA_AUTH_FAILED: [502, '知识库服务鉴权失败，请检查服务端配置'],
    IMA_FETCH_FAILED: [502, '线上知识库读取失败，请重试'],
    LLM_FAILED: [502, '模型调用或结构校验失败，请重试'],
    VALIDATION_ERROR: [400, '输入或生成结果未通过业务校验，请检查当前型号、简报和来源'],
  };
  const [status, message] = messages[error?.code] ?? [500, '服务暂时不可用'];
  return new ApiError(status, Object.hasOwn(messages, error?.code) ? error.code : 'INTERNAL_ERROR', message);
}

/** Incremental real research endpoints; recommendation mode is supplied by Workflow, never forged here. */
export function createResearchService({ store, now = Date.now, ima, workflowFactory, llmOperation = createLLMOperation }) {
  const execution = store.execution;
  const imaClient = async () => ima ?? await import('../../../packages/ima/index.mjs');
  const workflow = async (llm) => (workflowFactory ?? (await import('../../../packages/workflow/src/index.js')).createWorkflow)({ llm });

  function detail(userId, taskId) {
    const task = store.getTask(userId, taskId);
    const snapshot = execution.snapshot(userId, taskId);
    const freshness = {};
    const versions = {};
    for (const kind of ['retrieval', 'evidence', 'model_selection', 'personas', 'strategy', 'content', 'verification']) {
      const item = snapshot.artifacts[kind];
      freshness[kind] = { status: item?.freshness ?? 'missing', reasons: item?.reasons ?? [] };
      versions[kind] = item?.version ?? 0;
    }
    return { task, workflow_revision: snapshot.revision,
      retrieval: snapshot.artifacts.retrieval?.payload ?? null,
      evidence: snapshot.artifacts.evidence?.payload ?? [],
      persona_report: snapshot.artifacts.personas?.payload ?? null,
      strategy: snapshot.artifacts.strategy?.payload ?? null,
      content: snapshot.artifacts.content?.payload ?? null,
      verification: snapshot.artifacts.verification?.payload ?? null,
      confirmations: { model: current(snapshot, 'model_selection')?.payload ?? null, persona: null, strategy: null },
      artifact_versions: versions, freshness, operations: execution.listOperations(userId, taskId) };
  }

  async function run(userId, taskId, action, body, allowed, perform) {
    store.getTask(userId, taskId); // Hide foreign existence before checking request fields.
    actionInput(body, allowed);
    const start = execution.begin({ userId, taskId, action, expectedRevision: body.expected_revision,
      operationKey: body.operation_key, request: body, now: now() });
    const operation = start.operation;
    if (start.replayed) {
      if (operation.status === 'failed') throw new ApiError(502, operation.error.code, operation.error.message);
      return { ...detail(userId, taskId), operation };
    }
    try {
      const output = await perform(execution.snapshot(userId, taskId));
      execution.commit({ userId, taskId, operationId: operation.id, ...output, now: now() });
      return { ...detail(userId, taskId), operation: execution.listOperations(userId, taskId).find((item) => item.id === operation.id) };
    } catch (error) {
      const safe = safeError(error);
      execution.fail({ userId, taskId, operationId: operation.id, code: safe.code, now: now() });
      throw safe;
    }
  }

  function persistedEvidence(result, userId, taskId) {
    // Only called on server-returned IMA results. Never accept a browser-supplied evidence array.
    return result.evidence.map((item) => ({ ...item, id: `ev_${randomUUID()}`, task_id: taskId, user_id: userId }));
  }

  async function search(userId, taskId, body) {
    return run(userId, taskId, 'ima_search', body, ['need_images'], async () => {
      if (body.need_images !== undefined && typeof body.need_images !== 'boolean') throw invalid('need_images 必须为布尔值');
      const task = store.getTask(userId, taskId);
      const result = await (await imaClient()).retrieveProductEvidence({ query: task.product_query, needImages: body.need_images ?? true });
      const retrieval = { id: `retrieval_${randomUUID()}`, status: result.status, query: task.product_query,
        knowledge_base_id: result.knowledgeBaseId, warnings: result.warnings, fetched_at: new Date(now()).toISOString(),
        candidates: (result.status === 'resolved' ? [{ product: result.product, reason: '线上读取已匹配完整型号' }] : result.candidates)
          .map((item) => ({ candidate_id: `candidate_${randomUUID()}`, product_name: item.product, reason: item.reason })) };
      return { outputs: [{ kind: 'retrieval', payload: retrieval }, { kind: 'evidence', payload: result.status === 'resolved' ? persistedEvidence(result, userId, taskId) : [] }],
        invalidate: ['model_selection', ...DOWNSTREAM], taskPatch: { resolved_product_name: null, status: 'retrieved' } };
    });
  }

  async function confirmModel(userId, taskId, body) {
    return run(userId, taskId, 'model_confirmation', body, ['candidate_id'], async (snapshot) => {
      const retrieval = current(snapshot, 'retrieval');
      const candidate = retrieval?.payload.candidates.find((item) => item.candidate_id === body.candidate_id);
      if (!candidate) throw conflict('PRECONDITION_FAILED', '请从当前检索结果中选择明确型号');
      const task = store.getTask(userId, taskId);
      const result = await (await imaClient()).retrieveProductEvidence({ query: task.product_query,
        confirmedProduct: candidate.product_name, knowledgeBaseId: retrieval.payload.knowledge_base_id, needImages: true });
      if (result.status !== 'resolved' || result.product !== candidate.product_name) throw conflict('PRECONDITION_FAILED', '线上读取未匹配所选完整型号');
      return { outputs: [{ kind: 'evidence', payload: persistedEvidence(result, userId, taskId) },
        { kind: 'model_selection', payload: { candidate_id: candidate.candidate_id, product_name: result.product,
          source: 'user', confirmed_at: new Date(now()).toISOString() }, dependencies: { retrieval: ref(retrieval) } }],
        invalidate: DOWNSTREAM, taskPatch: { resolved_product_name: result.product, status: 'retrieved' } };
    });
  }

  async function personas(userId, taskId, body) {
    const startedAt = performance.now();
    let budget;
    try {
      return await run(userId, taskId, 'personas', body, [], async (snapshot) => {
        const evidence = current(snapshot, 'evidence');
        const selection = current(snapshot, 'model_selection');
        if (!evidence || !selection) throw conflict('PRECONDITION_FAILED', '请先取得当前型号的线上证据并选择明确型号');
        budget = llmOperation(undefined, { stage: 'personas', startedAt });
        const report = await (await workflow(budget.llm)).generatePersonas({ task: store.getTask(userId, taskId), evidence: evidence.payload.filter(item => item.media_type !== 'IMG') });
        return { outputs: [{ kind: 'personas', payload: report, dependencies: { evidence: ref(evidence), model_selection: ref(selection) } }],
          invalidate: ['persona_selection', 'strategy_selection', 'strategy', 'content', 'verification'], assertActive: budget.assertActive };
      });
    } finally { budget?.close(); }
  }

  async function image(userId, taskId, evidenceId) {
    const before = execution.snapshot(userId, taskId);
    const evidence = current(before, 'evidence');
    const item = evidence?.payload.find((entry) => entry.id === evidenceId);
    if (!item) throw notFound();
    if (item.media_type !== 'IMG') throw invalid('此证据不是图片');
    const selection = current(before, 'model_selection');
    if (!selection || item.applicable_model !== selection.payload.product_name) throw conflict('PRECONDITION_FAILED', '请选择当前图片对应的完整型号');
    let result;
    try { result = await (await imaClient()).fetchProductImage({ knowledgeBaseId: item.knowledge_base_id, mediaId: item.media_id, confirmedProduct: selection.payload.product_name }); }
    catch (error) { throw safeError(error); }
    if (!Buffer.isBuffer(result.bytes) || !result.bytes.length || result.bytes.length > 20 * 1024 * 1024
      || !['image/png', 'image/jpeg', 'image/webp'].includes(result.contentType)) throw new ApiError(502, 'IMA_FETCH_FAILED', '图片内容无效');
    return store.transaction(() => {
      const after = execution.snapshot(userId, taskId);
      if (before.revision !== after.revision || current(after, 'evidence')?.id !== evidence.id) throw conflict('REVISION_CONFLICT', '图片读取期间任务资料已改变，请刷新');
      if (item.image_metadata?.sha256 !== result.imageMetadata.sha256) {
        execution.invalidateWithinTransaction(userId, taskId, ['evidence', 'content', 'verification'], ['evidence_changed']);
        execution.supersede(userId, taskId, now());
        store.db.prepare('UPDATE tasks SET revision=revision+1,updated_at=? WHERE user_id=? AND id=?').run(new Date(now()).toISOString(), userId, taskId);
        return { changed: true };
      }
      return result;
    });
  }

  return { detail, search, confirmModel, personas, image };
}
