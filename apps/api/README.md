# @huawei-demo/api

Backend 独占模块。B1 提供真实本地账号、SQLite 持久化、服务端会话以及任务创建/列表/详情/修改。没有使用内存业务库、模拟登录或本地产品知识库。

## 启动与验证

要求 Node.js >=22.13，当前验证版本为 24.13.0。仅使用 Node 内置模块，不需要安装依赖，不改变根配置或锁文件。`node:sqlite` 在当前 Node 版本会输出实验功能提示。

从项目根目录执行：

```powershell
npm.cmd run start --workspace=@huawei-demo/api
npm.cmd run test --workspace=@huawei-demo/api
```

也可在 `apps/api` 下执行 `node src/server.mjs` / `node --test test/*.test.mjs`。

默认监听 `127.0.0.1:3001`；首次启动自动建立真实 SQLite 文件 `apps/api/.runtime/marketing.sqlite`，重复启动使用同一个文件。账号、哈希会话与任务都会保存，退出会话在数据库中删除。迁移由 `PRAGMA user_version` 管理，当前版本为 1；业务数据不写入 Git。

## 服务端配置

服务入口与 `llm:check` 自动加载 `apps/api/.env`；已存在的进程环境变量优先。只在服务端使用凭证，不打印其值。首次使用复制 `.env.example` 为 `.env` 并填写 `LLM_API_KEY`；该文件由根 `.gitignore` 排除，不能提交或放进前端 `VITE_*`。

| 变量 | 默认 / 用途 |
| --- | --- |
| `API_HOST` | `127.0.0.1` |
| `API_PORT` | `3001` |
| `API_DATABASE_PATH` | 上述 SQLite 文件；配置时建议使用绝对路径；禁止 `:memory:` |
| `API_ALLOWED_ORIGINS` | `http://localhost:3001,http://127.0.0.1:3001`；逗号分隔的完整浏览器 origin，不接受通配符或路径 |
| `API_COOKIE_SECURE` | 开发环境 `false`；生产环境必须 `true` |
| `NODE_ENV` | `production` 时强制安全 Cookie，且必须显式配置 HTTPS origin |

前端 Vite 本地联调示例（在启动 API 的 PowerShell 进程中）：

```powershell
$env:API_ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
npm.cmd run start --workspace=@huawei-demo/api
```

前端通过 `/api` 代理访问，或请求 API 时使用 `fetch(url, { credentials: 'include', ... })`。统一使用 `localhost` 或统一使用 `127.0.0.1`，避免 Cookie 站点不一致。上线采用同站点 HTTPS，由反向代理把 `/api` 转发到本服务；不要依赖跨站 Cookie。

## B1 接口提案（待 Coordinator 收口）

共享契约未定义身份端点及成功响应封装，以下为可调用的实际实现，不代表已修改/冻结共享契约。失败统一为 `{"error":{"code":"...","message":"...","details":[]}}`。

| 方法 | 路径 | 请求 | 成功响应 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `{email,password}` | 201 `{user}`，并设置会话 Cookie |
| POST | `/api/auth/login` | `{email,password}` | 200 `{user}`，并设置新会话 Cookie |
| GET | `/api/auth/me` | 无 | 200 `{user}` |
| POST | `/api/auth/logout` | 无 | 204，撤销当前会话并清除 Cookie |
| POST | `/api/tasks` | 任务输入 | 201 `{task}` |
| GET | `/api/tasks` | 无 | 200 `{tasks:[]}`，仅当前用户 |
| GET | `/api/tasks/:taskId` | 无 | 200 `{task}`；B2 后再追加真实下游结果 |
| PATCH | `/api/tasks/:taskId` | 任务输入的非空子集 | 200 `{task}` |

`user` 仅包含 `id,email,created_at`。邮箱大小写归一，密码要求 12—128 个字符。注册为本地自助账号，不声称已验证邮箱归属。

任务输入：

```json
{
  "product_query": "MateBook 14",
  "platform": "xiaohongshu",
  "audience_hint": "准备开学的大学生",
  "scenario": "课堂与宿舍学习",
  "goal": "引导到店体验"
}
```

`product_query` 非空、最多 200 字符；`platform` 使用共享契约四个枚举；其余三个字段可省略为空字符串，最多 2000 字符。禁止未知字段、`null` 及客户端提交的 `id,user_id,status,resolved_product_name`。任务 ID、所有者、时间戳和状态都由服务端产生。新任务为 `draft`，产品尚未解析时 `resolved_product_name` 为 `null`。

修改输入会清除产品解析结果并回到 `draft`，内部递增 `revision`，供 B3 检查过期请求；**下游结果表、清理与异步回写校验尚未实现**。状态不可由客户端任意指定，这是针对共享契约 PATCH“输入或状态”的最小变更提案，需 Coordinator 决定。删除接口未在共享契约定义，本批未添加。

除注册/登录外，业务请求需要会话。未登录返回 401；访问他人任务与不存在任务统一返回 404。跨域预检为浏览器协议例外，不读取业务数据。B2/B3 路径当前返回 404，不返回假结果。

新增错误码提案：`RATE_LIMITED`（429）、`INTERNAL_ERROR`（500）；另以 `VALIDATION_ERROR` 表达 400/413/415。认证按直连 IP 限制为每 15 分钟 20 次，最多 4 个并行密码运算，429 携带 `Retry-After`。不信任客户端提供的代理 IP 头；生产代理场景需 Coordinator 决定可信代理策略。

## 实现边界与后续接入

- 密码使用随机 salt 与 scrypt；Cookie 会话使用随机 256 位令牌，SQLite 仅保存 SHA-256 摘要，24 小时过期，`HttpOnly; SameSite=Lax`；生产为 `__Host-` Cookie 且带 `Secure`。
- 所有任务 SQL 同时约束当前用户和任务 ID，更新也在事务内验证归属；客户端无法通过请求体指定身份。
- 精确 origin 白名单、写入时拒绝跨站请求、JSON 类型和 32 KiB 请求体限制。异常不回传 SQL、原始错误或请求内容，日志不输出 Cookie/密码/凭证。
- 目前是单进程/单机的真实 SQLite + 本地身份服务。WorkBuddy Cloud 或其他托管 Auth/Database 尚未配置或验证；不能报告云端已连通。多副本部署、邮箱验证、密码找回和分布式限流不属于本批。
- B2 追加证据/画像/策略/成稿/核验/客户/跟进表，并实现“客户与关联任务都属于当前用户”的事务约束。
- B3 在 `src/api.mjs` 接入 IMA/Workflow 的冻结接口。每次生成读取当前证据，保存时对比任务 revision 与证据版本，输入变化时使依赖结果失效。当前不会自动扫描或调用这些模块。
- 共享类型、接口契约、根依赖及状态看板没有被修改。接口决定交由 Coordinator 统一维护。

## 已执行测试覆盖

`test/api.test.mjs` 使用真实 HTTP 服务器及临时文件 SQLite，6 个测试覆盖：注册/登录/退出/重启、哈希落库与会话撤销、双账号任务隔离与身份伪造、origin/跨站拒绝、输入/大请求体/SQL 文本处理、会话到期/认证限流/生产配置。

测试临时库只保存虚构测试账号与测试任务，不调用 IMA、LLM、Auth 云服务，不代表线上知识库或真实营销结论。测试结束删除专属临时目录。


## B4 真实 LLM 适配器

`src/llm.mjs` 导出 `loadLLMConfig(env?)` 和 `createLLMAdapter(config?, {fetchImpl?}?)`。后者返回 Workflow 所需的 `llm({stage,system,prompt,response_schema}) => Promise<object>`。集成端把它传入 `createWorkflow({llm})`，适配器不生成第二套营销提示词。B4 已具备真实 HTTPS 调用实现；生成 HTTP 编排仍待 B2/B3，不能据此声称整个闭环接通。

默认中转站 `https://api.openai-next.com/v1`，模型 ID `kimi-k2.5`，来自用户指定中转站公开指南和模型列表。实际账户的模型权限、计费、速度、输出质量仍需带 key 验证。只填写服务端 `apps/api/.env` 的 `LLM_API_KEY=`。从根目录检查：

```powershell
npm.cmd run llm:check --workspace=@huawei-demo/api
```

缺 key 时退出码2，不发网络请求；成功时仅输出 `ok,configured,model,elapsed_ms`。失败为净化后的 `LLM_FAILED`，不输出供应商响应或凭证。检查会产生一次真实模型请求（传输失败时按重试配置有界重试）。

| 变量 | 默认 / 用途 |
| --- | --- |
| `LLM_BASE_URL` | `https://api.openai-next.com/v1`；仅 HTTPS，无凭证/查询/hash |
| `LLM_MODEL` | `kimi-k2.5` |
| `LLM_API_KEY` | 空；缺失返回 `LLM_FAILED`/503 |
| `LLM_TIMEOUT_MS` | 60000；总时限1000—120000ms，覆盖请求、响应读取、重试和退避 |
| `LLM_MAX_RETRIES` | 1；0—2；一次 llm 最多 `1+retries` 次外呼 |
| `LLM_MAX_TOKENS` | 8192；128—32768 |
| `LLM_JSON_MODE` | true；发送 `response_format:json_object`，不等于原生 JSON Schema 约束 |
| `LLM_THINKING` | 空；默认不发送；只在中转站确认支持后设 enabled/disabled |

原始 Workflow `system,prompt` 与结构要求发给 Chat Completions；严格提取正文 JSON 对象，拒绝供应商 envelope、代码围栏、数组、空/纯 reasoning、拒绝与截断输出。Schema 和营销业务检查仍由 Workflow 执行。不声称中转站支持原生 schema、思考开关或已经达到预期速度。

只重试网络连接失败与408/429/500/502/503/504；不重试无效模型输出或401/403。默认每次适配器调用最多2次外呼，Workflow 若启用一次输出修复，业务层必须把最多4次外呼纳入预算；不在此层自动修复内容。重定向禁用，输入上限512KiB，供应商响应上限2MiB。超时504、鉴权/格式/上游失败502、缺配置/最终限流503，code 均为 `LLM_FAILED`。

模块自验 `npm.cmd run test --workspace=@huawei-demo/api` 共16项，包含已有6项真实 HTTP/SQLite、1项本地配置优先级、9项适配器传输/错误/结构测试。适配器测试使用测试 transport 和本机 HTTP 慢响应，不能当作真实 LLM 验证。
