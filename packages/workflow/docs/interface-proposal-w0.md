# W0 接口差异草案 v1

**待讨论/冻结，全部新增字段、HTTP 路径与函数均未发布。** 公共 API 以 `docs/api-contract.md` 为准。配套业务语义见 `business-rules-w0.md`；本草案不修改公共契约或 Backend/Frontend 实现。

## 1. 现有接缝原样接续

```js
createWorkflow({ llm, createId? })
llm({ stage, system, prompt, response_schema }) // Promise<JSON object | pure JSON string>
workflow.generatePersonas({ task, evidence }) // PersonaReport, status=draft
workflow.generateStrategy({ task, evidence, personaReport, personaName }) // Strategy
workflow.generateContent({ task, evidence, personaReport, strategy, version? }) // ContentDraft
workflow.verifyContent({ task, evidence, personaReport, strategy, draft }) // 契约 §5
```

stage 为 personas|strategy|content|verify；模块不读取 key，不接收供应商响应 envelope。JSON Schema 字段完整见 `src/schema.js`。Backend 的 B4 继续沿用该签名；接口冻结不要求重新实现业务提示词。

`PersonaReport`、`Strategy`、`ContentDraft` 的既有字段保留；`proof_points: string[]` 中 `[evidence_id]` 为引用约定。当前 `body` 是字符串：小红书 `### 卡片 1｜…` 至 `### 卡片 3—6｜…`，公众号四个 `##` 节；Frontend 可解析 Markdown 标题形成预览，不把派生视图冒充 API cards 数组。image_plan.position 是叙事位置 cover/body/ending，不是像素坐标，purpose 和 caption 保留。可下载图片成品的尺寸/格式由用户决定，本草案不冒称已交付。

## 2. 当前差异与最小变更清单

| 编号 | 缺口 | 草案 | 负责 |
|---|---|---|---|
| D1 | resolved_product_name 文本不能证明选型确认 | 返回候选 ID/完整名称/歧义原因；后端保存用户选型和检索版本，下载入库后才有证据 ID | Coordinator 候选/契约；Backend 保存；Frontend 选择 |
| D2 | PersonaReport 只有 confirmed，无主画像/版本 | 确认请求携带 report ID、选择名称、expected_revision；持久化确认元数据 | Backend；Workflow 规则 |
| D3 | Strategy 无确认字段 | 以任务详情外层 confirmations 绑定策略 ID + 版本，不擅加 Strategy.status | Backend + Coordinator |
| D4 | MarketingTask.status 不能表达 stale/running/confirmation | 详情外层提供执行与新鲜度；复用 Backend 执行状态，不由 Workflow 存状态 | Backend 提具体执行结构 |
| D5 | 无并发/证据版本条件 | 所有写动作以 expected_revision + 后端生成快照进行比较；操作 ID/幂等键由 Backend 实现 | Backend |
| D6 | IMG 的 source_url 可为 null | 保留 knowledge_base_id/media_id + 可信 source_metadata，Backend 提供鉴权图片代理 | Coordinator 定型；Workflow guards 适配 |
| D7 | 图片实际/人工审核未传入，正常结果一直 pending | 可追溯图片审核结果与访问检查，绑定素材/内容版本；不由客户端随意传 passed | Backend + Coordinator；Workflow 汇总 |
| D8 | 修订/建议无输入输出 | §6 W4/W5 提案，冻结前不新增公开端点 | Workflow 生成；Backend/Frontend 执行 |
| D9 | 导出 purpose/风险确认未定义 | §7 草稿与可发布用途提案，待用户产品取舍 | Workflow 提议；Coordinator 收口；Backend 强制 |

## 3. 确认与任务详情草案

候选 response 示例只表示结构，不是真实 IMA 结果：

```json
{
  "model_candidates": [
    {"candidate_id":"candidate_demo_1","product_name":"HUAWEI MateBook 14（鸿蒙版）","reason":"线上候选明确标注鸿蒙版"}
  ],
  "required_inputs": [
    {"field":"scenario","reason":"需要具体使用场景以形成营销切入点"}
  ]
}
```

依据 seams-v1-20261018：IMA ambiguous 仅返回 product/reason，尚未下载证据，不能附虚构 evidence_ids。Backend 在保存本次真实 candidates 时分配 candidate_id，绑定本任务与检索修订；用户确认后按完整型号重新读取，Backend 才为真实证据分配 id/task_id。检索变更后旧候选不能再确认。候选不可用时展示原因，不自动选择；不能让 LLM 或前端手拼候选或来源。

建议沿既有任务 PATCH 增加受控字段更新并冻结确认动作，路径可由 Coordinator 合并简化。以下请求是提议，禁止消费者按此直接上线：

| 候选动作/路径 | 请求体提案 | 原子校验 |
|---|---|---|
| POST tasks/:id/model-confirmation | `{candidate_id, expected_revision}` | 候选属于本任务当前检索，用户有权限；绑定完整型号 |
| POST tasks/:id/persona-confirmation | `{persona_report_id, persona_name, expected_revision}` | 当前报告、有效引用、唯一主画像；报告如需编辑先保存新版本 |
| POST tasks/:id/strategy-confirmation | `{strategy_id, expected_revision}` | 当前策略，匹配已确认主画像与当前上游 |
| POST tasks/:id/strategy（已存在） | `{expected_revision}` | 服务端加载已确认主画像，调用现有 personaName 参数 |
| POST tasks/:id/content（已存在） | `{expected_revision}` | 服务端加载当前已确认策略与证据；version 由服务端分配 |
| POST tasks/:id/verify（已存在） | `{content_id, content_version, expected_revision}` | 对精确当前内容/证据快照核验，不能用旧核验覆盖新内容 |

正常请求不从客户端接收完整证据/画像/策略作为权威值；这些由 Backend 从当前用户数据库读取。用户编辑以受控 editable 字段提交并校验。user_id、状态、当前版本、核验结果与确认人不可客户端任意 PATCH。

任务详情外层最小提案（复用既有成功 envelope，最终形状待 Backend/Coordinator 收口）：

```json
{
  "workflow_revision": 12,
  "confirmations": {
    "model": {"candidate_id":"candidate_demo_1","product_name":"HUAWEI MateBook 14（鸿蒙版）"},
    "persona": {"report_id":"persona_demo_2","persona_name":"开学换新的大学生"},
    "strategy": {"strategy_id":"strategy_demo_3"}
  },
  "freshness": {
    "personas": {"status":"current","reasons":[]},
    "strategy": {"status":"stale","reasons":["platform_changed"]},
    "content": {"status":"stale","reasons":["strategy_stale"]},
    "verification": {"status":"stale","reasons":["content_stale"]}
  },
  "required_actions": ["regenerate_strategy","confirm_strategy","regenerate_content","verify"]
}
```

每个 confirmation 由服务端另存依赖快照/actor/time；此示例省略内部存储，不暗示确认永远有效。字段为空/缺失表示未确认，不能以历史 confirmation 猜测当前通过。freshness 的 status 仅提议 missing/current/stale，不代替 Backend 正在定义的执行状态。

## 4. 版本与竞态语义（Backend 实现）

- `workflow_revision` 提案为后端维护的业务修订号；成功的语义输入变更、确认、当前产物提交都递增。进度轮询、无变化 PATCH、图片临时签名刷新不递增营销语义版本。Lead 另有自己的 revision，不能仅比较任务版本保护 W5。
- 发起生成时捕获当前业务 revision 和输入/证据/产物依赖；提交结果时重新比较，若已变化则拒绝成为当前结果，返回冲突详情。失败/旧请求不能清空新有效结果。即使中途把字段改回原值，也不能把过时请求标当前。
- `expected_revision` 缺失/过旧应拒绝受保护写动作，HTTP 409 与错误码（建议 REVISION_CONFLICT）由 Coordinator 冻结；返回 current_revision 和需刷新对象即可，不泄漏他人数据。
- 两个同时生成内容的请求不能都用同一版本编号写当前；Backend 原子分配内容 version 并做 operation/idempotency 去重。重复确认/请求重试不产生多份用户动作。
- 保存依赖快照与有选择地保留未受影响产物：平台改变即使全局 revision 增加，画像确认仍有效，但进行中的旧策略/内容调用不得提交。Backend 不得简单“revision 不同就全部产物永久失效”。
- 状态/版本字段最终命名服从公共契约。Workflow 输出不携带自行管理的数据库 revision，也不与 Backend 建第二套状态机。

## 5. IMA 图片与审核接缝

此处来源类型已由 39d15df（seams-v1-20261018，契约 §8.2 与 packages/contracts/index.d.ts）冻结：MARKDOWN/IMG 的 source_url 均允许 null，source_metadata 为准确 IMA 声明。其余图片审核/确认字段仍是提案。已定向读取真实最小摘要和 IMA 声明；摘要仅为历史读取证明，不作为生产输入。不得为绕过 guards 构造 https://example... URL。

Workflow 仅在可信 Backend 入参中接受可追溯的线上来源元数据与非空知识库/media_id；客户端不能自行添加 retrieval='ima_openapi' 充当线上证据。Backend 用 (knowledge_base_id,media_id) 代理/刷新、鉴权并防跨用户读取。源身份和图片访问 URL 分开；prompt 不需要密钥或临时签名 URL。

图片审核结果提案：`{evidence_id, media_id, source_revision, access_status, visual_status, reason, reviewed_at, reviewer}`；枚举与来源待冻结。访问通过与视觉通过分开；只有匹配当前素材且可追溯审核才能解除相应 pending。缺失/过期/不一致不能默认通过。不在本次 W0 实现此新函数参数。

## 6. W4 / W5 最小业务函数与 HTTP 草案

以下函数**未实现、未导出**；等待 Coordinator 冻结字段后按单目标推进。首先 W4，随后 W5；仍复用 createWorkflow 的适配器、事实防护与既有生成器。

```js
// 纯业务规划：不写库、不生成完整营销文案。
planRevision({ task, evidence, personaReport, strategy, draft, verification, feedback })
// => RevisionPlan
reviseArtifact({ task, evidence, personaReport, strategy, draft, verification, plan })
// => RevisionResult；一次只修订一个 target，返回新 ID/版本，不覆盖基准产物
suggestFollowUp({ task, evidence, lead, followups, draft, verification, feedback? })
// => FollowUpSuggestion；不自动发送、保存或改变 lead.stage
```

feedback 提案：`{target:'task'|'personas'|'strategy'|'content', instruction:string, base_artifact_id:string|null, base_version:number|null}`。前端先选择对象、写反馈；Backend 验证基准当前版本。核验问题由服务端载入 verification；反馈中的任何新产品断言不能作为证据。

RevisionPlan 结构示例（结构合成，不代表 API 已生效）：

```json
{
  "target":"content",
  "base_artifact_id":"content_demo_4",
  "base_version":1,
  "feedback":"正文缩短，保留完整型号和事实来源",
  "affected":["content","verification","export_eligibility"],
  "preserved":["model_confirmation","persona_confirmation","strategy_confirmation","evidence"],
  "requires_confirmation":[],
  "required_actions":["verify"],
  "proposed_task_patch":null,
  "pending_checks":[]
}
```

若反馈要求换人群，plan.target='task'，proposed_task_patch 仅列用户明确提出的字段；requires_confirmation=['task_patch']，affected 从 personas 起。只返回计划，不在 reviseArtifact 内静默 PATCH/跨层生成。Frontend 显示受影响项后让用户确认；Backend 保存简报并失效，再逐步生成。

RevisionResult 提案：`{target, base_artifact_id, base_version, artifact, change_summary:string[], preserved:string[], requires_confirmation:string[], required_actions:string[]}`。artifact 为该目标既有契约模型之一；目标层确认清除，新内容总要 verify。更改目标/反馈范围超出计划则重新规划，不能自动扩大循环。错误结构沿现有约定，新增 reason 分类由 Coordinator 收口。

FollowUpSuggestion 结构示例：

```json
{
  "lead_id":"lead_demo_1",
  "task_id":"task_demo_1",
  "next_action":"先确认软件使用需求，再安排到店体验",
  "rationale":["客户输入的需求标签包括资料整理；不是已验证的客户行为"],
  "questions":["希望现场验证哪些软件和资料流程？"],
  "suggested_message":"可以带一份日常资料到店确认具体配置与适用性。",
  "content_reference":null,
  "pending_checks":["当前图文仍待图片核验，暂不建议作为可发布成稿发送"],
  "requires_confirmation":true
}
```

关联成稿仅当版本当前且符合冻结的可发布规则才填写 `{content_id,version}`；否则 null 并给核验动作。建议不含未输入的 next_follow_up_at、不伪造客户反馈，不自动创建“已联系”记录；用户采用建议与提交 FollowUp 是两个动作。Backend 校验 lead.user_id、任务归属及两侧版本，内部添加 suggestion ID/版本/时间。

候选 HTTP：POST tasks/:id/revision-plans、POST tasks/:id/revisions、POST leads/:id/followup-suggestions。请求带 expected_revision 与必要的 lead_revision，返回成功 envelope 及 current revision 由 Backend/Coordinator 确定；本草案不擅加到公共路由。

## 7. 导出差异与待决项

现有 POST tasks/:id/export 缺请求/响应和核验限制。最小请求提案：`{content_id, content_version, expected_revision, format:'markdown'|'json', purpose:'review'|'publish', acknowledge_risks:boolean}`。用户未选用途不可偷偷当 publish；purpose='review' 也必须附来源/核验与草稿标识。rejected 只能内部诊断包/完整审阅，不是干净成稿导出。

返回文件元数据/内容方式与已存在 Backend 实现对齐，不额外引入二进制导出框架。Backend 强制校验，Frontend 显示无法导出的原因和可执行动作；是否允许 pending/rejected 内部导出由用户取舍后冻结。核验 unknown 不等于 rejected，更不等于通过。

## 8. 请求反馈与下一实施项

1. Coordinator：冻结 D1—D7 中最小确认/版本与证据接缝；来源最小摘要和声明已收到并完成适配；导出产品选择由用户决定。
2. Backend：回传现有任务详情/执行状态、版本/保存接缝与真实 LLM 适配器导出路径，不重做业务提示词；评估本提案与 B1 实现差异。
3. Frontend：按既有 body/image_plan 做展示；反馈所需确认文案和表单缺口，字段待公共契约通知后实施。
4. Workflow：W0 提交后先修复可信 IMA 空 URL 接缝并自测；得到真实适配器/证据后联调 W1—W3，按冻结签名推进 W4/W5。
