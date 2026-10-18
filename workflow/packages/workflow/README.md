# WP1 系统推荐模式

按最新 PR1/PR2 默认零必填文本、无需逐步人工确认。新增 prepareRecommendedTask/recommendPersona 以及四阶段推荐选择接入，详见 [可运行示例](docs/recommended-mode.md)。以下旧确认规则适用于不传 selection 的人工精细模式。

# @huawei-demo/workflow

Workflow 角色负责的无第三方依赖 Node.js ESM 模块，要求 Node >=22。实现 W1 画像/策略、W2 小红书/公众号内容和 W3 核验。公开 JSON 字段遵循 `docs/api-contract.md`；本模块不实现 HTTP、鉴权、数据库、ima SDK 或 LLM 网络客户端。

入口：`src/index.js` 的 `createWorkflow`、`WorkflowError`；本地类型声明在 `src/index.d.ts`。提示词在 `src/prompts.js`，LLM JSON Schema 在 `src/schema.js`，代码规则在 `src/guards.js`。

## 后端接入

```js
import { createWorkflow } from '@huawei-demo/workflow';

const workflow = createWorkflow({
  // 注入真实后端适配器；凭证由适配器自行管理，不传给工作流。
  llm: async ({ stage, system, prompt, response_schema }) => {
    return backendLLM.completeJson({ system, prompt, schema: response_schema });
  },
});

// 后端先验证当前用户拥有 task 和所有关联记录，从业务库存取当前快照。
const input = { task, evidence };
const personas = await workflow.generatePersonas(input);
await savePersonas(personas); // status 始终是 draft，不自动确认

// 等用户在 UI 明确确认画像，后端将已保存报告状态设为 confirmed。
const personaReport = await loadConfirmedPersonas(task.id);
const strategy = await workflow.generateStrategy({
  ...input, personaReport, personaName: selectedPersonaName,
});
// 用户确认策略之后再调用；Strategy 现有契约无 confirmed 字段，确认状态由后端负责。
const draft = await workflow.generateContent({ ...input, personaReport, strategy, version: 1 });
const verification = await workflow.verifyContent({ ...input, personaReport, strategy, draft });
// verifyContent 不修改 draft。后端保存报告，并自行按结果更新 verification_status。
```

LLM 适配器接收 `{ stage, system, prompt, response_schema }`，stage 为 `personas | strategy | content | verify`。返回 **JSON 对象或纯 JSON 字符串**，不返回 OpenAI/其他供应商的完整 response envelope 或代码围栏。适配器负责提取供应商输出、超时、重试、计费与日志脱敏。Schema 只是供应商输出约束；模块仍会再次校验结构和业务引用。适配器缺失或调用失败时不会回退为硬编码营销文案。

各函数输出分别为 `PersonaReport`、`Strategy`、`ContentDraft`、契约 §5 核验报告。`createId(prefix)` 可选，默认生成随机 UUID ID；由模块生成 ID、task_id、platform、version 和状态，不由 LLM 决定。输入记录必须是正常 JSON 数据。

## 生成和核验规则

- 已确认的完整 `resolved_product_name` 必填；缺失抛出 `VALIDATION_ERROR` 并在 `details[0].candidates` 提供证据中的候选型号。不自行猜测或模糊匹配版本；仅做大小写、空白和 Unicode 兼容归一化。
- 所有传入证据必须属于当前任务，具有知识库 ID、media_id、标题、读取时间、完整型号与核验状态。`source_url` 为 HTTP(S)，或严格为 `null` 且可信后端 IMA 记录具有 `source_metadata.retrieval='ima_openapi'`、`requires_refresh=true`，并含有效 download_origin、source_url_note 和非空 checks。真实 IMA 事实/图片无持久公开 URL 时以知识库/media_id 追溯，Backend 负责鉴权代理；不伪造 URL。文件路径、空字符串、缺失 URL、localhost 仍拒绝，不能用 metadata 绕过无效非空地址。格式检查不能证明服务真实调用过 ima；后端只能传入 IMA 模块保存的记录，不能把客户端提交的 retrieval 标记当证明。metadata 的 scope/source_url_note/checks/model_match_basis 及 applicable_version/query 会进入生成上下文保留原文使用边界，下载地址、headers 和其他字段不转给 LLM。
- 只向 LLM 提供当前型号且未被拒绝的证据；无可用事实抛出 `IMA_NO_RESULT`。pending 证据可以生成草稿，但引用核验仍为 pending。每次调用都传当前证据，不依赖历史会话。
- 2—3 个画像必须包含证据引用、营销假设和待确认项。策略要求显式选择一个已确认画像；`proof_points` 保持契约的 `string[]`，每项以 `[evidence_id]` 引用事实，无需增加共享字段。
- 小红书正文采用 3—6 个 `### 卡片 1｜…` 段落，默认使用最多 6 张不同图片；公众号使用 `## 场景问题`、`## 产品证据`、`## 适用边界`、`## 行动建议`，默认使用 2 张不同图片。正文和每张图图注保留完整型号。只实现这两个平台的内容生成。
- 图片数为 `min(目标数量, 当前不同素材数)`；小红书不足 3 张、公众号不足 2 张会在核验中报告 pending。按知识库 ID + media_id 去重，不能用不同 evidence_id 重复同一素材。素材不足时保留实际数量，不能伪造凑数。
- 核验合并代码规则和独立 LLM 语义审核。代码检查引用/型号/平台结构/图片去重/敏感数字与绝对化话术；语义审核检查否定改肯定、事实含义、兼容性、虚假亲测、场景推断等。最终按 rejected > pending > passed 汇总，模型“全通过”不能覆盖代码拒绝。语义审核调用失败、漏类别、虚构引用时为 pending。
- 图片来源和尺寸检查不代表已经看到原图。模块不下载、渲染或查看图片，实际外观、参数脚注、访问有效性保留 pending 和人工动作；因此含图的正常示例整体为 pending。后续由 Coordinator（兼 IMA）/Frontend 完成访问验证，用户完成人工图片核验，不能直接把该项改为 passed。
- 本模块不替后端执行或宣称通过身份审核。后端在调用前检查用户所有权；输入变化、证据更新、画像/策略修改后，应清除下游结果并重算。共享契约尚无输入快照版本字段，模块不能独立识别所有历史结果失效。

错误为 `WorkflowError`，提供 `.code`、`.message`、`.details`。主要 code：`VALIDATION_ERROR`（确认/字段/引用不合法或生成断言触发规则）、`IMA_NO_RESULT`（当前型号无可用事实）、`LLM_FAILED`（调用或模型结构失败）。供应商异常原文不会返回，避免携带凭证。核验中的确定性拒绝以结构化 check 返回，LLM 语义不可用不会误报通过。

## 本地验证和结构化样例

```powershell
npm test --workspace @huawei-demo/workflow
npm run example --workspace @huawei-demo/workflow
```

也可以在本模块目录运行 `node --test test/workflow.test.js`，不需要 npm install、锁文件或联网。

`test/fixtures.js` 是明确标注的合成测试数据与假 LLM 适配器，仅由测试/样例脚本导入。`test/example-output.json` 包含任务、证据、画像、策略、两平台成稿与核验报告的完整结构化示例；运行 `test/example.mjs` 可重建。两平台对比共用同一画像和策略以隔离平台变量；实际前端修改平台后仍应重新确认/生成适用策略。

测试覆盖确认顺序、仅换人群/仅换平台、缺图、重复素材、错误型号、跨任务引用、虚构数字/价格、文件路径、恶意引用、LLM 错误、语义审核缺失及拒绝优先级。合成适配器只能验证编排、约束和上下文变化，不能证明真实模型文风、人群差异或事实审核质量。线上 LLM、真实 ima、图片视觉核验、身份隔离、存储、端到端和人工确认流程尚需集成验证。

## 提交 Coordinator 的最小接缝请求

1. 冻结后端传入 `task/evidence/personaReport/strategy/draft` 的模块接缝，允许 `proof_points` 使用上述行内引用约定。
2. 补齐画像确认/主画像选择、策略确认的 HTTP 请求与响应；本模块不新增公共字段或路由。
3. 后端提供真实 `llm(request)` 适配器；IMA 提供同型号事实和不同图片、真实来源 URL、元数据及读取时间。
4. 明确任务输入与证据变化时的下游失效、人工图片审核及导出 pending/rejected 内容的规则。当前模块不会宣称未完成集成已完成。
