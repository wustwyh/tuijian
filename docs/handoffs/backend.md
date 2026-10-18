# Backend 最近交接

角色 / 分支 / worktree：Backend（服务与状态负责人） / `feat/backend` / `E:\codes\创业\10.18黑客松-worktrees\backend`

任务：B1 接续、B4；职责基线 `roles-v2-20261018`（已在分支祖先中），基于当前契约 §7；B1/LLM 现实现已发 Coordinator 收口，未自行修改共享契约。

## 已交付

- B1 提交 `f520e47`：真实本地账户、scrypt、哈希会话、HttpOnly Cookie、SQLite 文件、用户隔离任务创建/列表/详情/PATCH；保留原实现。
- B4 本交接所在提交：`apps/api/src/llm.mjs` 的 `loadLLMConfig` 与 `createLLMAdapter`；后者返回 `llm({stage,system,prompt,response_schema}) => Promise<JSON object>`，按 Workflow 消费方签名实现。
- `src/env.mjs`、`.env.example`、`src/check-llm.mjs` 与模块 `llm:check` 脚本；服务入口自动加载模块 `.env`，进程环境优先，凭证不入前端/日志/Git。
- 默认 relay `https://api.openai-next.com/v1` 与 `kimi-k2.5`（用户指定中转站公开文档列出）；缺 key 明确失败，不发假结果。
- 适配器严格提取 JSON 对象；上下文/schema 由 Workflow 提供；不声称原生 schema 约束。默认总时限60s、最多2外呼；只做有界传输重试，无模型内容自动修复；错误净化、禁跟随重定向、请求/响应大小限制。

## 已验证

- Node v24.13.0 / SQLite3.50.4；无第三方依赖，未改根依赖、共享类型、前端或 Workflow。
- `npm.cmd run test --workspace=@huawei-demo/api`：16/16。6项 B1 测试包含真实文件数据库关闭重开、双账号越权、会话退出后重开、伪造身份、跨站写入、输入与限流。
- 9项适配器测试覆盖请求签名、JSON提取、缺key不外呼、净化鉴权错误、瞬时重试上限、拒绝/截断/无效输出不重试、大小限制、真实本机HTTP慢响应头与流式正文超时、共享退避截止时间和配置边界；另1项验证 `.env` 加载与环境优先级。测试 transport 不是线上LLM。
- 真实 LLM 未验证：尚缺用户在服务端填写 key。`llm:check` 缺 key 退出2，不能报告接通。
- 开发后端地址 `http://127.0.0.1:3001`；SQLite保存在 `apps/api/.runtime/marketing.sqlite`，启动/重启保留数据；当前进程和运行结果见信箱交付消息。监听 origin 允许 localhost/127.0.0.1 的3001/5173/5174。

## 接入样例 / 待 Coordinator 冻结

- 注册201/登录200：请求 `{email,password}`、响应 `{user}`；GET `/api/auth/me` 返回 `{user}`；POST logout204。user仅 `id,email,created_at`，密码12—128字符。
- 任务 POST201、GET/PATCH200 `{task}`；列表200 `{tasks:[]}`；详情当前仅task。输入 `product_query,platform,audience_hint,scenario,goal`；PATCH非空子集，不能设身份/状态/已解析型号。
- 错误 `{error:{code,message,details:[]}}`；未登录401，他人和缺失任务统一404。
- 前端同源 `/api`、`credentials:'include'`。B1实现与最小净化样例已通过信箱回复 Frontend/Coordinator；完整表见 `apps/api/README.md`。
- B4注入 `createWorkflow({llm:createLLMAdapter()})`；只提供结构对象，不返回供应商 envelope。业务层若输出修复一次，按默认传输预算最多4外呼，待 Workflow/Coordinator 收口。

## 未完成 / 阻塞

- B2/B3：下游结果保存重开、确认状态、失效/过时回写保护、IMA/Workflow HTTP编排、导出、客户与跟进尚未实现。相关路径当前404。内部revision已有，不能据此声称防竞态已完成。
- B5：向Coordinator请求图片函数、有效期、安全约束；将基于持久化且归属当前用户的 evidence ID 做同源代理/刷新，不暴露上游签名URL。当前图片HTTP未交付。
- 真实模型缺 key；服务端填写 `apps/api/.env` 的 `LLM_API_KEY` 后运行 `npm.cmd run llm:check --workspace=@huawei-demo/api`，不把 key 发进聊天/信箱。
- 云Auth/Database未接入；当前真实本地身份/SQLite继续使用，产品/提供方变更由Coordinator/用户决定。线上IMA、完整前后端生成闭环未验证。
- 待W0确认/失效/核验导出规则，以及Coordinator正式冻结/集成上游模块，继续做B2/B3/B5；不自行定义营销业务规则。

## 通信与下一步

职责切换回执：`20261018T073559Z_backend_b4-kimi-start`；鉴权/B4签名/预算/B5请求回复：`20261018T074152Z_b2ec_b1-b4-contract-reply`。已接收Workflow签名确认、Coordinator职责回执、Frontend接口请求并写回执。

下一可验收动作：配置key后验证一次真实Kimi结构输出；在正式接缝到达后实现证据/下游状态持久化与鉴权图片代理。B4交付提交可用 `git log -1 --format=%h -- apps/api/src/llm.mjs` 获取。
