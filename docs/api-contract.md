# API 与数据契约 — MVP

> 本文件是前端、后端、ima 集成和 Agent 工作流之间的唯一接口约定。字段变更由模块负责人提出具体草案，Coordinator（兼 IMA）统一收口。职责基线 roles-v2-20261018 仅调整负责人，未补齐的字段/签名仍待冻结。

## 1. 通用约定

- API 前缀：`/api`
- 请求/响应：JSON
- 鉴权：除登录/注册外，都要求当前用户身份。
- 错误格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "产品型号不明确，请选择具体版本",
    "details": []
  }
}
```

- 常见错误码：`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`VALIDATION_ERROR`、`IMA_AUTH_FAILED`、`IMA_NO_RESULT`、`IMA_FETCH_FAILED`、`LLM_FAILED`、`VERIFICATION_FAILED`。

## 2. 核心数据模型

### MarketingTask

```json
{
  "id": "task_...",
  "user_id": "user_...",
  "product_query": "MateBook 14",
  "resolved_product_name": "HUAWEI MateBook 14（鸿蒙版）",
  "platform": "xiaohongshu",
  "audience_hint": "准备开学的大学生",
  "scenario": "开学学习与宿舍使用",
  "goal": "引导到店体验",
  "status": "draft | retrieved | generated | verified | exported",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

`platform` 暂支持：`wechat_official`、`xiaohongshu`、`wechat_moments`、`store_poster`。

### EvidenceItem

```json
{
  "id": "ev_...",
  "task_id": "task_...",
  "knowledge_base_id": "...",
  "media_id": "...",
  "media_type": "MARKDOWN | IMG | ...",
  "title": "02-HUAWEI MateBook 14（鸿蒙版）.md",
  "source_url": "https://...",
  "fetched_at": "ISO-8601",
  "fact_excerpt": "用于生成的原文摘要",
  "image_metadata": {
    "width": 817,
    "height": 892,
    "format": "png",
    "usage": "产品外观"
  },
  "applicable_model": "HUAWEI MateBook 14（鸿蒙版）",
  "verification_status": "passed | pending | rejected"
}
```

### PersonaReport

```json
{
  "id": "persona_...",
  "task_id": "task_...",
  "personas": [
    {
      "name": "开学换新的大学生",
      "typical_tasks": ["课堂笔记", "资料整理"],
      "pain_points": ["预算有限", "设备协同复杂"],
      "buying_triggers": ["便携", "续航", "屏幕体验"],
      "objections": ["价格不确定", "软件兼容性"],
      "content_angle": "从开学任务切入",
      "evidence_ids": ["ev_..."],
      "assumptions": ["基于产品事实形成的营销假设"],
      "pending_checks": ["具体配置价格待核验"]
    }
  ],
  "status": "draft | confirmed"
}
```

### Strategy

```json
{
  "id": "strategy_...",
  "task_id": "task_...",
  "main_conflict": "学习效率与设备协同复杂度",
  "primary_persona": "开学换新的大学生",
  "key_message": "围绕具体学习任务说明价值",
  "proof_points": ["证据1", "证据2"],
  "outline": ["场景问题", "证据", "适用边界", "行动"],
  "cta": "到店体验并核验配置",
  "risk_notes": ["不写未核验价格"]
}
```

### ContentDraft

```json
{
  "id": "content_...",
  "task_id": "task_...",
  "platform": "xiaohongshu",
  "version": 1,
  "title_options": ["标题1", "标题2", "标题3"],
  "selected_title": "标题1",
  "body": "平台化正文或卡片内容",
  "cta": "行动引导",
  "image_plan": [
    {
      "evidence_id": "ev_...",
      "position": "cover | body | ending",
      "caption": "图注",
      "purpose": "说明这张图承担什么叙事任务"
    }
  ],
  "poster_brief": {
    "headline": "海报主标题",
    "subheadline": "副标题",
    "layout_notes": "版式说明"
  },
  "verification_status": "draft | passed | pending | rejected"
}
```

### Lead / FollowUp

```json
{
  "id": "lead_...",
  "user_id": "user_...",
  "display_name": "虚构客户A",
  "source": "门店咨询",
  "needs": ["轻薄", "预算有限"],
  "budget_note": "待确认",
  "stage": "new | interested | comparing | follow_up | won | lost",
  "next_follow_up_at": "ISO-8601"
}
```

```json
{
  "id": "follow_...",
  "lead_id": "lead_...",
  "task_id": "task_...",
  "note": "客户关注协同和预算",
  "next_action": "发送小红书图文并邀请到店",
  "created_at": "ISO-8601"
}
```

## 3. API 端点

### 任务

- `POST /api/tasks`：创建任务。
- `GET /api/tasks`：列出当前用户任务。
- `GET /api/tasks/:taskId`：读取任务详情、画像、策略、内容和核验状态。
- `PATCH /api/tasks/:taskId`：修改任务输入白名单；状态由服务端流程维护。

### ima 检索与证据

- `POST /api/tasks/:taskId/ima-search`
  - 请求：`{ "query": "MateBook 14", "need_images": true }`
  - 响应：`{ "evidence_ids": ["ev_..."], "warnings": [] }`
- `GET /api/tasks/:taskId/evidence`：列出证据。
- `POST /api/tasks/:taskId/evidence/:evidenceId/verify`：更新核验状态。

### Agent 流程

- `POST /api/tasks/:taskId/personas`：生成客群画像。
- `POST /api/tasks/:taskId/strategy`：基于画像和证据生成策略。
- `POST /api/tasks/:taskId/content`：生成平台内容。
- `POST /api/tasks/:taskId/verify`：执行事实、图片、平台、合规核验。
- `POST /api/tasks/:taskId/export`：导出 Markdown 或 JSON。

### 客户跟进

- `POST /api/leads`：创建客户。
- `GET /api/leads`：列出当前用户客户。
- `PATCH /api/leads/:leadId`：更新客户阶段或需求。
- `POST /api/leads/:leadId/followups`：新增跟进记录。
- `GET /api/leads/:leadId/followups`：读取跟进记录。

## 4. ima 集成约束

- 只有后端可读取 `IMA_OPENAPI_CLIENTID`、`IMA_OPENAPI_APIKEY`。
- 前端永远拿不到这两个值。
- 搜索为空时返回 `IMA_NO_RESULT`，前端提示换关键词或浏览目录，不得编造事实。
- media_id 必须使用接口返回值，不手工拼接。
- 每次生成前先读取证据，不直接凭历史对话生成。
- 本地知识库文件路径不得出现在 `source_url` 或最终导出中。

## 5. 核验输出

```json
{
  "task_id": "task_...",
  "overall_status": "passed | pending | rejected",
  "checks": [
    {
      "type": "fact | image | platform | compliance | identity",
      "item": "产品名称",
      "status": "passed | pending | rejected",
      "reason": "已与线上 ima 条目匹配",
      "evidence_ids": ["ev_..."]
    }
  ],
  "manual_actions": ["发布前核验当日价格"]
}
```

## 6. 首版不做

- 批量任务、团队空间、管理员后台。
- 真实客户敏感信息加密与脱敏策略。
- 广告平台投放 API。
- 自动发布到公众号/小红书/朋友圈。
- 向量数据库或知识库本地镜像。


## 7. 接缝责任（职责基线 v2）

| 接缝 | 提案/实现主责 | 消费/协作 |
|---|---|---|
| 线上证据、型号候选、图片元数据 | Coordinator 的 IMA 模块 | Backend 入库分配 ID，Workflow 使用，Frontend 展示 |
| HTTP、身份、任务详情与保存 | Backend | Frontend 调用；Coordinator 收口公共契约 |
| 生成输入输出、确认/失效/修订语义、跟进建议 | Workflow | Backend 执行保存，Frontend 交互；Coordinator 收口 |
| 服务端真实 LLM 适配器、超时和传输重试 | Backend | Workflow 提供调用/结构化输出需求 |
| 图片代理/刷新与访问接口 | Backend | Coordinator 提供上游约束，Frontend 实际显示 |
| 成稿内容/配图语义与排版预览 | Workflow / Frontend 各负责其部分 | Backend 提供数据；成品导出格式另行收口 |
| 核验结果与导出限制 | Workflow 提业务规则，Backend 强制执行 | Frontend 展示；产品取舍交用户 |

本节不新增或批准具体 API 字段。B1、IMA 和 LLM 函数接缝已在 §8 冻结；生成接口完整请求响应、型号/画像/策略确认、证据版本、修订/跟进建议端点、pending/rejected 导出策略仍需提出草案并冻结。
身份隔离由 Backend 服务端检查，不能以 LLM 自评替代；Workflow 仅报告已获得的证据与自身规则检查结果。
协商使用 `communication.md` 的共享信箱，正式变更必须提交本契约和相关共享类型后通知消费者。

## 8. 最小接缝冻结：seams-v1-20261018

本节冻结已由实现方和消费方确认的 B1、IMA 和 LLM 适配器接缝。它表示接口决定，**不表示接口已全部合入或线上闭环已通过**。B1 依据 Backend `f520e47` 及 Frontend `d3575f7`；IMA 交付 `8f62c32`；LLM 依据 Workflow 当前声明及双方信箱回执。共享声明入口：`packages/contracts/index.d.ts`。

### 8.1 身份与任务 B1

| 请求 | 成功响应 | 约束 |
|---|---|---|
| `POST /api/auth/register` | 201 `{user}` | 请求 `{email,password}`；注册成功设置会话 Cookie |
| `POST /api/auth/login` | 200 `{user}` | 同一请求结构；错误邮箱/密码返回 401 |
| `GET /api/auth/me` | 200 `{user}` | 未登录/会话失效返回 401 |
| `POST /api/auth/logout` | 204，无响应体 | 撤销当前服务端会话并清 Cookie；不要求 JSON 请求体 |
| `POST /api/tasks` | 201 `{task}` | 创建当前用户任务 |
| `GET /api/tasks` | 200 `{tasks:[]}` | 只返回当前用户任务 |
| `GET /api/tasks/:taskId` | 200 `{task}` | B1 只提供 task；聚合生成结果的字段待下一次冻结 |
| `PATCH /api/tasks/:taskId` | 200 `{task}` | 仅修改输入白名单；无修改字段或未知字段返回校验错误 |

`user = {id,email,created_at}`，不返回密码、哈希或会话令牌。邮箱规范化为小写；密码 12—128 个字符。Cookie 为 HttpOnly、SameSite=Lax；HTTPS 环境使用 Secure。前端通过同源 `/api` 代理或明确允许的 Origin，携带 `credentials:'include'`；不把 IMA/LLM 凭证作为浏览器鉴权方式。

任务输入白名单为 `product_query,platform,audience_hint,scenario,goal`。创建必填非空 `product_query`（最多 200 字符）和有效 `platform`；其他三项可省略并存为空字符串，每项最多 2000 字符。生成前的必填业务确认由 Workflow 规则另行约束。任务未解析时 `resolved_product_name:null`。客户端不能直接写 `user_id`、`resolved_product_name`、任务状态或核验状态。B1 输入实际变化后清除已解析产品、回到 draft；后续生成结果的完整失效矩阵由 W0 提案后冻结。

所有业务 ID 的读取/修改必须在服务端检查当前用户归属；不存在或属于其他用户的任务均返回 404。业务所有权检查同样适用于后续图片、证据、生成、导出、客户和跟进接口。当前本地实现是真实 SQLite 和本地账号，不能宣称已接入云 Auth/Database。

错误继续使用 §1 的 `{error:{code,message,details:[]}}`，新增 `RATE_LIMITED`（429）和 `INTERNAL_ERROR`（500）。413/415 可使用 `VALIDATION_ERROR`；不得把内部异常、SQL、Cookie、凭证或供应商原始响应透传。

### 8.2 IMA 服务端证据与图片

入口 `packages/ima/index.mjs`，完整声明 `packages/ima/index.d.ts`：

```js
retrieveProductEvidence({query, needImages = true, confirmedProduct?, knowledgeBaseId?})
// resolved: {status:'resolved', product, knowledgeBaseId, evidence, warnings}
// ambiguous: {status:'ambiguous', knowledgeBaseId, candidates:[{product,reason}], warnings}
fetchProductImage({knowledgeBaseId?, mediaId, confirmedProduct})
// {bytes, contentType, imageMetadata, fetchedAt}
```

以上为**内部模块调用**，不是新增 HTTP 请求体。Backend 分配证据 `id/task_id`、校验用户/任务归属并保存。证据增加原始 `query`、`applicable_version`、`source_metadata`；保留真实线上 `knowledge_base_id/media_id/title/fetched_at`。IMA 初始 `verification_status` 一律 pending，来源成功不表示营销事实已核验。

`source_url` 类型为 `string | null`。真实 IMG 可以没有长期公开 URL，此时必须保留 `source_metadata.retrieval='ima_openapi'`、`requires_refresh=true` 及真实来源标识；Workflow 不得仅因缺少公网 URL 拒绝这种证据，也不得为通过校验拼造 URL。Markdown 若有 source_url，是原文标注的官方入口，未单独抓取核验。

Backend 在验证用户、任务、证据、IMG 类型和已确认型号后，按**保存的真实 media_id**调用图片函数，提供同源鉴权代理。图片 HTTP 路由/响应由 Backend 提案后另行冻结，当前不虚构已实现的路径。前端通过代理显示原图。IMA 临时下载 URL、素材签名 headers 和 OpenAPI 凭证不得进入业务持久化、前端、导出、Git 或信箱；图片签名有效期未验证，访问时重新获取。不得用代理地址替换来源 URL 冒充上游事实来源。

`ImaError` 的内部 `details` 是对象；适配公共 HTTP 错误时转换为数组（有内容时 `[details]`，否则 `[]`），仅传递脱敏字段。来源库不匹配、型号歧义、空结果或读取失败不可降级为本地文件/测试夹具。

I1 当前只支持 MateBook 14 候选解析和已确认的鸿蒙版读取。文档是产品发现卡，不支持补齐精确规格、价格、补贴、库存或兼容性；`warnings` 和原文边界必须随证据传给 Workflow。

### 8.3 Workflow 与真实 LLM 适配器

```ts
type LLMRequest = {
  stage: 'personas' | 'strategy' | 'content' | 'verify';
  system: string;
  prompt: string;
  response_schema: Record<string, unknown>;
};
type LLMAdapter = (request: LLMRequest) => Promise<Record<string, unknown> | string>;
```

Workflow 通过 `createWorkflow({llm})` 消费适配器；适配器仅返回业务 JSON 对象或纯 JSON 字符串，不能返回供应商 envelope、Markdown 代码围栏或假文案。Workflow 每次提供完整当前证据和业务提示词；Backend 只负责真实网络调用、供应商格式提取、严格 JSON 解析、超时、有界传输重试和脱敏错误。响应 Schema 的供应商原生支持情况必须实测；不支持时不得声称已启用原生结构约束。

Workflow 继续执行结构/引用/业务校验；模型自评不能覆盖确定性拒绝。输出修复由 Workflow 定义，与 Backend 传输重试共同设置外呼上限；精确次数及修订策略待提案，不由两层各自无限重试。缺配置、401 或调用失败保持明确 `LLM_FAILED`，不使用夹具回退。

### 8.4 下一冻结点

W0 主责：型号/画像/策略确认、主画像选择、输入/证据变更失效、修订与版本、pending/rejected 导出、跟进建议。Backend 据此提供请求响应及竞态保存草案，Frontend 提供交互所需字段；Coordinator 收口后发布下一契约提交。本节不自行决定这些产品规则，也不把待提案端点交给前端猜测实现。
