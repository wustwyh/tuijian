# Workflow 交接

## 当前交接：W0 / 职责 v2

- W0 已提交 `ab7e3a2`，信箱交付 `20261018T074511Z_a72e_workflow_w0-handoff`。紧接修复 Coordinator 指出的 IMA null URL 接入问题：`guards.js` 允许可信服务器记录的 null URL + `source_metadata.retrieval='ima_openapi'` + `requires_refresh=true`，仍要求知识库/media_id/时间/任务归属；无效非空地址不能借标记绕过。`index.d.ts` 局部声明适配 IMA 实际结构，不改公共类型；`prompts.js` 仅转发来源范围/检查信息，不转发下载地址、headers 等上游字段。
- 新修复验证：在 Node v24.13.0 执行 `npm test`，22 项通过；新增真实 IMA 结构形态的合成回归用例，覆盖事实/图片 null URL、缺失/错误元数据、来源标识缺失、文件路径绕过与上游额外字段不转发。仍未使用真实 LLM；来源形态测试不证明联网成功，图片实际访问/视觉检查继续 pending。依据为 Coordinator 消息 `20261018T074700Z_c2-seams-v1-published`、seams-v1 共享类型与 IMA `packages/ima/index.d.ts` 的 `UnpersistedEvidence` 准确声明。

- 分支/worktree：`feat/workflow` / `E:\codes\创业\10.18黑客松-worktrees\workflow`。职责基线 `roles-v2-20261018`（`ea126ce`）已在 `63b470f` 合入，原业务提交 `953572c` 保留。下方旧交接仅保留历史验证，旧独立 QA 安排已停用。
- 已交付：`packages/workflow/docs/business-rules-w0.md` 与 `interface-proposal-w0.md`。包含简报缺失/型号歧义、型号/主画像/策略确认、依赖与失效矩阵、版本并发责任、导出限制提案、W4 修订/W5 跟进建议的最小签名与 JSON 样例。未修改公共契约、已导出函数或 Backend/Frontend 实现，所有新字段/路径均标明待冻结。
- 自验：职责基线与 `953572c` 均为 HEAD 祖先；在既有工作树运行 `npm test --workspace @huawei-demo/workflow`，19 项通过。文档交叉检查现有四函数/类型/Schema/API 契约，未将合成测试称为真实模型质量验收。
- 信箱：接续回执 `20261018T073911Z_c51a_workflow_role-ack`；LLM 签名回复 `20261018T073911Z_6e2f_workflow_llm-contract-reply`；接缝/Frontend 回复在 `20261018T074200Z_1b2f_workflow_w0-checkpoint`，均位于共享信箱 messages/workflow。
- 待收口：确认/版本/图片审核接缝由 Coordinator 冻结，Backend/Frontend 提实现差异。pending/rejected 的内部草稿与可发布导出规则为产品提案，需用户取舍。真实 LLM/线上证据联调尚未执行。
- 接入问题已局部修复：Coordinator 报告的 IMA null URL 结构已适配；公共来源类型已在 39d15df 冻结，真实最小摘要已定向读取；仍待真实证据/适配器做运行集成验证。不能把来源标记当客户端自证或图片审核通过。
- 已对齐 seams-v1 `39d15df`；W0 候选示例不再附下载前 evidence_ids；事实/图片的来源范围、版本和型号匹配限制均传入 LLM。真实可信性由 Backend IMA 调用与入库提供，格式测试不识别完整伪造的客户端记录。
- 下一可验收动作：Backend 回 W0 最小 HTTP/版本方案；Coordinator 冻结确认/修订接缝后继续 W4/W5。LLM 联合预算提案已发信箱 `20261018T075130Z_d19b_workflow_budget-proposal`，当前无输出自动修复，每阶段一次适配器调用（按 B4 默认最多两次外呼）；提案不是已实施预算。缺 key 不询问聊天凭证，不伪造真实模型验证。

## 历史交接：953572c / W1—W3

- 角色 / 分支 / worktree：Workflow / `feat/workflow` / `E:\codes\创业\10.18黑客松-worktrees\workflow`。
- 本次任务：W1 画像/策略；同时实现 W2 两平台内容与 W3 核验。契约基线 `ac4aa35` 的 `docs/api-contract.md`，未修改公共契约、根配置或其他角色代码。
- 已交付：`packages/workflow/src/index.js` 导出 `createWorkflow`、`WorkflowError`；实例提供 `generatePersonas`、`generateStrategy`、`generateContent`、`verifyContent`。`src/index.d.ts` 为本地声明；提示词 `src/prompts.js`；JSON Schema `src/schema.js`；确定性规则 `src/guards.js`；完整接入说明 `packages/workflow/README.md`。
- 结构化样例：`packages/workflow/test/example-output.json`，含任务、证据、画像、策略、小红书/公众号成稿与核验。全部为明确标注的合成测试数据与假 LLM 输出，不是线上证据、不代表真实产品参数，生产源码不导入测试夹具。
- 提交号：本交接与模块同一提交；通过 `git log -1 -- docs/handoffs/workflow.md` 可定位，交付回执另报实际 SHA。

## 已验证

在 Node v24.13.0 执行 `npm test`（模块目录）及 `npm run example`。19 个模块测试通过：确认前置、型号歧义/版本隔离、跨任务引用、不同人群上下文、同人群不同平台结构与数量、0—2 张缺图、相同 media_id 去重、虚构数字/价格、完整数值匹配、未知/图片事实引用、无效模型输出、语义核验失败/缺类别、代码拒绝优先、待核验证据、修改型号失效和输入字段白名单。

测试仅证明模块规则和假适配器下的编排，未验证线上 ima、真实 LLM 质量、实际图片像素/有效期、HTTP、身份隔离、存储或端到端运行。

## 接入说明

```js
const workflow = createWorkflow({ llm: backendAdapter });
const personaReport = await workflow.generatePersonas({ task, evidence });
// 用户确认并由后端保存 status = confirmed 后：
const strategy = await workflow.generateStrategy({ task, evidence, personaReport, personaName });
// 用户确认策略后：
const draft = await workflow.generateContent({ task, evidence, personaReport, strategy, version: 1 });
const verification = await workflow.verifyContent({ task, evidence, personaReport, strategy, draft });
```

`llm({ stage, system, prompt, response_schema })` 返回对象或纯 JSON 字符串；凭证、网络、超时、重试由后端适配器管理。函数无数据库或 HTTP 副作用；保存、身份校验、用户确认和内容状态更新由后端负责。

`proof_points` 使用契约 `string[]` 加 `[evidence_id]` 行内引用。画像报告生成后始终 draft；策略显式选择已确认画像。当前内容仅支持 `xiaohongshu`、`wechat_official`。同型号素材不足按实际数量返回，并在核验报告标 pending；不复制凑数。

生成函数错误 code 为 `VALIDATION_ERROR`、`IMA_NO_RESULT`、`LLM_FAILED`。核验报告采用契约 §5，rejected 优先于 pending 优先于 passed。LLM 自评不会覆盖确定性错误。图片元数据不能证明实际访问与视觉适用性，相关 check 保留 pending 与人工动作，故含图的正常样例整体为 pending。不会宣称已通过身份审核。

## 待 Coordinator 收口 / 阻塞

1. Backend 提供真实 LLM JSON 适配器、当前用户所有权校验和持久化。IMA 提供真实同型号事实与图片、来源 URL、读取时间和元数据。
2. 冻结画像确认/主画像选择和策略确认的请求响应；模块未擅加共享字段或 HTTP 路由。
3. 明确任务输入/证据变化的下游失效规则。当前契约没有输入快照版本，后端必须清除旧画像/策略/内容/核验，不应复用历史结果。
4. IMA/QA/产品明确实际图片访问/视觉人工核验及 pending/rejected 的导出策略；不能直接把未查看的图片标为已通过。

下一步：Coordinator 接收本分支后，Backend 注入真实适配器，用线上 ima 的同型号事实和至少 3 张不同图片调用四个入口，保存并重新打开结果，QA 对同人群切换平台、同平台切换人群做真实模型验收。
