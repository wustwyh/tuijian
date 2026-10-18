# API 与数据契约 — MVP

> 本文件是前端、后端、ima 集成和 Agent 工作流之间的唯一接口约定。字段变更必须由 Coordinator 统一修改本文件。

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
- `PATCH /api/tasks/:taskId`：修改任务输入或状态。

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
