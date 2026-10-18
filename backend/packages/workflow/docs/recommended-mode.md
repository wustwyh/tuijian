# WP1 可运行的系统推荐初稿

按用户 PR1/PR2 接续，默认不要求逐阶段人工确认。此模块业务增量可直接接入，不声称新增 HTTP 已发布。旧 W0 的“人群/场景必填、逐步确认”仅适用于人工精细模式；推荐模式优先采用本文。产品完整型号仍由 Backend 验证真实目录引用后提供，不能由默认值猜测。

Backend 保持逐阶段执行、保存、进度与 CAS；每阶段新建自己的预算工厂，用相应 llm 注入 createWorkflow。不要四阶段共用单阶段120秒。所有函数均不写库、不发 HTTP；Backend 只在当前 operation/revision 下保存并继续，失败时保留已经保存的中间产物。

```js
const prepared = workflow.prepareRecommendedTask({ task: savedTask });
// Backend 保存 prepared.task 的有效简报与 defaults_applied 来源。
const task = prepared.task;
const personaReport = await workflow.generatePersonas({ task, evidence });
const selection = workflow.recommendPersona({ task, evidence, personaReport });
// 报告仍 status:draft；保存 selection，不能伪写 confirmed。
const strategy = await workflow.generateStrategy({ task, evidence, personaReport, selection });
const draft = await workflow.generateContent({ task, evidence, personaReport, selection, strategy, version: nextVersion });
const verification = await workflow.verifyContent({ task, evidence, personaReport, selection, strategy, draft });
```

默认平台小红书、目标到店体验；空人群与场景成为明确标记“系统推荐/营销假设”的探索偏好，具体候选由现有 personas 模型调用根据当前证据生成。画像提示词把适合先形成初稿的候选置首，recommendPersona 默认采用首个候选，并诚实解释规则，不声称真实市场排名。产品证据不足仍中止；资料发现卡不升级成完整规格。默认值和推荐理由需页面可见，用户可换平台/目标/候选。

selection = {source:'system_recommended'|'user_selected',task_id,persona_report_id,persona_name,reason,context_key}。显式 personaName 选择现有候选时来源为 user_selected，仍不是确认其产品事实或营销假设。context_key 为业务依赖绑定，非鉴权凭据；Backend 应保存服务器生成的选择，不能接受客户端伪造 selection。画像报告、输入、证据状态/内容变化后必须重新 recommendPersona；同内容的临时来源签名刷新不作为营销语义变化。

generateStrategy 在 selection 下可省 personaName；明确提供时必须匹配。generateContent/verifyContent 必须传同一 selection，策略必须指向所选画像。不传 selection 仍要求 confirmed 画像和显式 personaName，保留原人工模式。推荐策略不写人工 confirmed，内容保持 draft；核验不因“一键”而跳过，pending/rejected 仍原样展示。Frontend 可直接消费原有画像、策略、body、image_plan、核验结构，不增加假 cards 或成品图片字段。

测试：26项，新增四项验证零必填文本的四阶段模式、人工守卫保留、旧选择拒绝和事后换人群。使用合成证据/假适配器，尚非真实模型或 HTTP 闭环。Backend 真 Kimi 最小 JSON 已通过，后续真实营销联调由我承接业务报错定位；目录取证/保存/浏览器连通由相应模块验证。
