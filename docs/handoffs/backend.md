# Backend 最近交接

角色 / 分支 / worktree：Backend / `feat/backend` / `E:\codes\创业\10.18黑客松-worktrees\backend`

本次任务 ID / 契约版本：B1；基于 `ac4aa35` 的 `docs/api-contract.md`。共享契约未改动；以下身份端点、成功响应封装、状态限制与错误扩展等待 Coordinator 收口。

## 已交付

- `apps/api/src/{server,api,config,store,auth,validation,errors}.mjs`：可启动 HTTP 服务；真实 SQLite 文件迁移；scrypt 密码；服务端 Cookie 会话；用户自身任务创建、列表、详情、修改。
- `apps/api/package.json`：模块级 start/test；零第三方依赖，不修改根配置或锁文件。
- `apps/api/test/api.test.mjs`：6 个真实 HTTP + 文件 SQLite 测试，覆盖持久化重启、会话撤销、双账号隔离和输入防护。
- `apps/api/README.md`：启动、配置、实际端点、前端接入、最小契约变更请求及后续接缝。
- 提交号：以本交接文件所在的 B1 提交为准，可运行 `git log -1 --format=%h -- docs/handoffs/backend.md` 获取。

## 已验证

- 实机 `node --version`：`v24.13.0`；内置 SQLite：`3.50.4`。
- `node --test test/api.test.mjs`（模块目录）：6/6 通过。测试在真实 SQLite 文件中创建两个账号；A 创建任务，B 的列表为空且读/改 A 任务均 404；数据库关闭重开后任务及有效会话仍可读取；退出后旧会话在再次重开后仍为 401。
- 数据库中没有明文密码或明文会话令牌，客户端响应没有密码字段。覆盖过期会话、限流、伪造身份、无效 JSON/超大请求、跨站写入拒绝。
- 未执行：WorkBuddy Cloud / 托管 Auth/Database 连通性、线上 IMA/LLM、前后端联调和完整 Demo 闭环。没有读取 `.env` 凭证值。

- worktree 根目录 `npm.cmd run test --workspace=@huawei-demo/api`：6/6 通过；`git diff --check` 通过。
- 实际入口 `node apps/api/src/server.mjs` HTTP 冒烟：未登录 401、注册 201、任务创建 201，并检查真实数据库文件已生成。服务已停止，未遗留后台监听。

## 接入说明 / Coordinator 最小变更请求

1. 冻结身份端点：`POST /api/auth/register`、`POST /api/auth/login` 请求 `{email,password}`，返回 `{user}` 并设置 HttpOnly Cookie；`GET /api/auth/me` 返回 `{user}`；`POST /api/auth/logout` 返回 204。前端使用 `credentials:'include'`，开发 origin 通过 `API_ALLOWED_ORIGINS` 显式允许。
2. 冻结成功响应：任务创建/详情/修改 `{task}`，任务列表 `{tasks:[]}`。B1 详情仅包含真实任务，后续 B2 再补真实结果，不伪造空画像或核验成功。
3. 明确 PATCH 仅允许 `product_query,platform,audience_hint,scenario,goal`；状态与已解析产品由受约束的后端流程维护，禁止客户端直接标记 `verified/exported`。产品/画像确认端点仍待决，当前未实现。
4. 同意本地真实 SQLite + 本地账号作为当前可运行存储方案，或提供指定云服务的后端 SDK/配置接口及迁移要求。当前没有云端身份/数据库集成证据；不能宣称已接入 WorkBuddy。
5. 错误扩展请求：`RATE_LIMITED`（429）、`INTERNAL_ERROR`（500），保留统一 `{error:{code,message,details:[]}}`。

从根目录启动：`npm.cmd run start --workspace=@huawei-demo/api`，默认 `127.0.0.1:3001`；验证：`npm.cmd run test --workspace=@huawei-demo/api`。详见模块 README。

## 未完成 / 阻塞

- B2（真实结果保存重开、客户/跟进）和 B3（IMA/Workflow 编排、下游失效与过期回写、导出）尚未交付。
- Auth/Database 云方案由 Coordinator/用户明确；当前环境未发现相关服务配置变量名，没有外部云连接工具可用，不声称云端不可用，只报告未配置/未验证。
- IMA/Workflow 稳定的导出函数、错误类型、输入输出与证据版本由对应 Agent/Coordinator 提供。当前 API 没有静态导入未实现模块，也不会用本地知识库或测试夹具补齐事实。
- 内部任务 revision 已留接缝，但不能据此声称异步竞态或下游失效已实现。

## 下一步

Coordinator 收口上述 B1 接口并交给 Frontend/QA 联调；确定云服务选择后继续 B2。取得上游冻结函数签名后再推进 B3。
