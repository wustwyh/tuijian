# Backend HTTP / 状态 / 图片方案 v2 草案

状态：待 Coordinator 收口；本文件不是新增的生效 API，不表示下列 B2/B3/B5 已实现。基于正式 `39d15df` / `seams-v1-20261018`、Workflow W0 `ab7e3a2`。B1/B4 已交付，继续沿用。

## 1. 真实调用与基线

- Backend HEAD 已合并正式 `39d15df` 为 `de445f3`，原 `0a90ace`（B4）与 `f520e47`（B1）仍可达，无冲突、工作树干净。
- 用户已在服务端填写 key；`node apps/api/src/check-llm.mjs` 真实返回 `ok:true,configured:true,model:kimi-k2.5,elapsed_ms:5489`。只证明最小 JSON 连通性，不代表真实营销生成质量/原生 Schema/思考开关/整链路通过。
- 已重启开发 API 加载 key，当前 PID34928、127.0.0.1:3001；会话数据库保留。未登录401、前端5173/5174预检204。

## 2. 最小详情聚合（D1—D7）

保留 `{task}` 外壳，在 `GET /api/tasks/:taskId` 追加以下真实保存结果。所有列表/历史/操作都校验 user+task；没有结果用 null，不伪造生成内容。

```json
{
  "task": {"id":"task_example","resolved_product_name":null},
  "workflow_revision": 1,
  "retrieval": null,
  "evidence": [],
  "persona_report": null,
  "strategy": null,
  "content": null,
  "verification": null,
  "artifact_versions": {"personas":0,"strategy":0,"content":0,"verification":0},
  "confirmations": {"model":null,"persona":null,"strategy":null},
  "freshness": {
    "personas":{"status":"missing","reasons":[]},
    "strategy":{"status":"missing","reasons":[]},
    "content":{"status":"missing","reasons":[]},
    "verification":{"status":"missing","reasons":[]}
  },
  "operations": []
}
```

示例 task 为节选，实际保留完整 MarketingTask。persona_report/strategy/content 为现有契约模型；verification 为现有核验模型。`artifact_versions` 由服务端单调分配，不更改 Workflow 返回类型。历史最新有效产物可保留在这些字段，但任何消费者必须同时检查 freshness；stale 不能被当作可确认/生成/导出当前结果。不以任务 status 取代依赖检查。

`retrieval={id,version,status:'ambiguous'|'resolved',query,warnings,candidates}`。候选 `{candidate_id,product_name,reason,evidence_ids}` 由实际 IMA 结果入库后分配并绑定 task+retrieval version；ambiguous 没下载证据时 evidence_ids 为空数组，不能制造 ev ID。resolved 也不会自动确认型号。重检索保留历史候选但不能确认过期候选。

确认元数据均由服务端写入并绑定完整依赖快照：

- model：`{candidate_id,product_name,retrieval_version,confirmed_at}`。
- persona：`{report_id,artifact_version,persona_name,confirmed_at}`；报告 status 随确认变为 confirmed，唯一主画像必须真实存在。
- strategy：`{strategy_id,artifact_version,confirmed_at}`；不擅加 Strategy.status。

`operations` 最多返回最近20项净化执行信息：`{id,action,status,started_at,finished_at,error}`，status 为 running/succeeded/failed/superseded；error 为 null 或 `{code,message}`，不保存上游原始错误。执行状态与产物 freshness 分开。异步状态可用详情 GET 轮询，但首版仍同步 HTTP，不引入队列。

## 3. 写入请求和响应

创建任务仍保持 B1 输入；以下写操作要求当前 `expected_revision`（正整数）。可由客户端提供 `operation_key`（UUID，重试复用），服务端生成 operation ID。`operation_key` 为本动作重试标识，不是业务对象 ID。

| 方法/路径（/api 前缀） | 请求体 | 成功 |
|---|---|---|
| PATCH tasks/:id | B1输入子集 + expected_revision | 200，扩展详情（保留task），无变化不递增revision |
| POST tasks/:id/ima-search | `{query,need_images,expected_revision,operation_key?}` | 200，扩展详情 + 本次operation；query须等于已保存product_query，变关键词先PATCH |
| POST tasks/:id/model-confirmation | `{candidate_id,expected_revision,operation_key?}` | 200，扩展详情+operation |
| POST tasks/:id/personas | `{expected_revision,operation_key?}` | 200，扩展详情+operation |
| POST tasks/:id/persona-confirmation | `{persona_report_id,persona_name,expected_revision,operation_key?}` | 200，扩展详情+operation |
| POST tasks/:id/strategy | `{expected_revision,operation_key?}` | 200，扩展详情+operation |
| POST tasks/:id/strategy-confirmation | `{strategy_id,expected_revision,operation_key?}` | 200，扩展详情+operation |
| POST tasks/:id/content | `{expected_revision,operation_key?}` | 200，扩展详情+operation |
| POST tasks/:id/verify | `{content_id,content_version,expected_revision,operation_key?}` | 200，扩展详情+operation |
| GET tasks/:id/evidence | 无 | 200 `{evidence,workflow_revision}` |

B1 PATCH 的 expected_revision 增加是下一契约的显式迁移点，须与 Frontend 一起同步后生效；当前已运行 B1 不提前拒绝原请求。其他 B1 成功响应保持兼容。

型号确认流程：先查候选归属/当前检索，使用保存的完整 candidate.product_name 作为 confirmedProduct 调 IMA。远端返回 resolved 且型号一致后，在同一原子提交中保存证据和确认；失败不假装确认成功。对于已有 resolved 证据，可重用同一当前检索快照。客户端不提交 raw media_id/URL/产品完整名称作为权威来源。

正常生成只从库加载当前任务、当前证据和已确认产物；不接收客户端整份 evidence/persona/strategy。Workflow 的必填/精确型号/确认/平台规则照 W0 执行。缺输入返回400 VALIDATION_ERROR + details 条目 `{field,reason}`；缺确认/上游失效返回409 PRECONDITION_FAILED + `{required_actions:[...]}`。来源读取成功不会把 pending 证据自动升级 passed。

后续受控编辑、证据审核、W4/W5 尚需精确字段，本轮不把它们并入任意 PATCH；客户端不能直接写 passed、确认人、版本或 user_id。

## 4. 保存、失效和竞态

- `workflow_revision` 复用 B1 tasks.revision。成功的语义输入/确认/证据快照切换/当前产物提交各递增一次；轮询、无变化PATCH、执行进度、图片签名/访问刷新不递增。
- 不做全量清空。按 W0 矩阵：换产品从型号起失效；换人群/场景/目标从画像起；换平台保留型号和画像确认，从策略起；事实语义/拒绝变化从画像起；图片语义变化从内容起；只改成稿从核验起；单纯访问URL刷新只清访问检查。
- 旧产物和依赖快照留历史；当前 freshness/reasons 与确认在同一事务更新。用于生成的事实状态降级不得靠旧快照继续绕过。
- 远端调用前短事务捕获 task revision、候选/证据语义版本、确认和上游产物 ID/version。一个任务最多一个 running 操作；新生成并发返回409 OPERATION_IN_PROGRESS；输入编辑仍可执行，并使旧操作 superseded。不同任务不互相阻塞。
- 不跨网络持有数据库事务。回写时先重新校验 user+task、operation仍running、revision与依赖快照未变，再原子分配 artifact version 和提交；否则标记superseded，返回409 REVISION_CONFLICT，旧有效结果不被清除/覆盖。输入改回原值仍有不同revision，旧请求不能复活。
- 内容version在原子提交内单调分配，并加DB唯一约束(task_id,kind,version)。失败不改当前结果；后完成的旧核验不能把新成稿标passed。
- 幂等键以(user,task,action,key)唯一，另存规范请求摘要。相同键不同请求拒绝409 IDEMPOTENCY_CONFLICT；相同请求进行中返回409 OPERATION_IN_PROGRESS；已成功且结果仍当前则复用，已过时则返回REVISION_CONFLICT，绝不再次发模型请求。历史失败复用净化失败，用户主动重试用新键。
- 进程重启后未完成running操作标failed（净化中断原因），不自动重发计费请求；最后有效产物保留。数据库迁移采用版本化且保留v1账号/会话/任务，覆盖升级和重开自测。
- 冲突错误仍 `{error:{code,message,details:[{current_revision,operation_id?}]}}`；先查归属，任何他人ID统一404，不能借revision泄漏存在性。

## 5. B5 同源图片 GET 提案

`GET /api/tasks/:taskId/evidence/:evidenceId/image`，不接受 URL/media_id/知识库 ID 参数。用户Cookie鉴权 -> user/task/evidence同归属 -> evidence是当前IMG -> 完整型号已确认且与素材一致 -> 按保存的knowledge_base_id/media_id/confirmedProduct调用正式fetchProductImage。

- 成功200，原始 PNG/JPEG/WebP bytes，Content-Type 为模块检查结果；Content-Length为实际bytes；Cache-Control:no-store、X-Content-Type-Options:nosniff。无需新前端凭证，无302重定向，不透传上游header。GET每次向IMA拿新临时地址，显式刷新就是再次GET，不额外设计刷新凭证端点。
- 上游模块负责文件头/类型/非零尺寸/20MiB限制/禁重定向；API复核支持类型和长度，绝不持久化临时签名URL/下载header/图片二进制缓存。长期身份仍为真实knowledge_base_id/media_id，代理URL不替代source_url。
- 若当前素材sha256与此次bytes对应sha不同，则记录证据语义变化、失效内容/核验/旧视觉审核，返回409 EVIDENCE_CHANGED要求刷新详情；仅新签名但sha相同不失效正文。访问成功只保存可追溯访问时间/sha，不写visual passed或营销核验passed。
- 错误：未登录401；他人/缺失/非本任务证据404；非IMG400 VALIDATION_ERROR；无当前型号确认409 PRECONDITION_FAILED；过期证据409 REVISION_CONFLICT。IMA_NO_RESULT404、IMA_AUTH_FAILED502（不是用户401）、IMA_FETCH_FAILED502、VALIDATION_ERROR400；未知异常500 INTERNAL_ERROR。details由内部对象转换为公共数组，仅白名单净化字段，不透传URL/header/原始响应。
- 媒体下载期间任务/证据被改：返回前重查版本和归属，过时不返回像素，409。模块返回像素可读不等于视觉适用检查通过。

## 6. B4 / Workflow 精确预算联合提案

建议正式固定业务生成动作：总期限120000ms（包含Workflow初次/最多一次格式修复、传输/读流/退避），最多2次llm调用，每次最多2次外呼，总外呼最多4；单次llm期限min(60000ms,动作剩余时限)。配置LLM_MAX_RETRIES只允许降低业务路径尝试次数，设2不能增加到6外呼。

实现方式为Backend创建每动作独立llm闭包，共享绝对deadline与外呼计数，保留已冻结llm(request)签名；Workflow最多一次结构修复。额度在真正fetch前扣除，deadline在所有读流和退避有效，超出统一LLM_FAILED；Workflow业务拒绝不自动修复为通过。单独llm:check仍按独立适配器配置，不扩大业务动作预算。请Workflow确认两次输出边界、Coordinator冻结数值。

## 7. 导出与下一批范围

pending/rejected内部审阅用途仍是用户产品待决；本提案不批准任何用途、不假设passed已可获得。先推进与导出无关的确认/生成/持久化/图片，导出实现时必须有当前内容/核验精确绑定与服务端归属。不得用前端复制绕过冻结规则。

请Coordinator优先冻结 §2—§5 的最小确认/聚合/图片和冲突码，以及 §6 预算。Frontend可回需要调整的字段；Workflow确认失效矩阵和业务前提。之后Backend提交分批可运行B2/B3/B5并自测双账号、保存重开、输入/证据失效、旧请求回写、图片刷新/隔离。


## 8. 预算工厂实施补充

针对 Workflow 20261018T075130Z_d19b 与 Coordinator 20261018T075355Z_c3 请求，Backend已在自有模块实现可审阅工厂 `createLLMOperation(config?,{stage,startedAt?,now?,fetchImpl?})`，返回 `{llm,assertActive,signal,stats,close}`；精确用法与取消语义见模块README最后一节。公开LLMRequest保持不变。接受Workflow单阶段120秒/每次60秒/当前一次输出最多2外呼/将来一次修复最多4外呼、verify本轮不修复；工厂对verify强制只允许一次llm。适配器失败不授予修复；真实fetch和响应读流与退避均受AbortSignal取消，关闭不遗留请求。

业务HTTP在受理时取performance.now()，把startedAt传入工厂，完成后在提交事务内assertActive并校验revision/依赖；未冻结/未实现HTTP前不声称此回写保护已在业务路径生效。IMA顶层warnings持久化与展示位置在§2 retrieval.warnings，不擅加Workflow公共函数参数；证据scope/fact_excerpt等边界继续传给Workflow。
