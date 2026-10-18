# Backend 演示接口交接

按用户最新要求，只接通前端需要的演示功能，不再扩展通用机制。分支 feat/backend；服务 http://127.0.0.1:3001；原账号和SQLite数据库保持原位。启动：项目根 `npm.cmd run start --workspace=@huawei-demo/api`。当前已启动，不要重复占用3001。服务端 apps/api/.env 已配置 Kimi k2.5，无需再次填写key。

## 前端调用

所有路径复用现有登录Cookie。前端Vite代理 /api；5173/5174允许本机联调。

| 方法与路径 | 请求 / 响应 |
|---|---|
| GET /api/products | {status:'ready',products:[{id,name,category,note,image_url}],coverage,updated_at}；当前一个真实线上型号 |
| GET /api/products/:id/image | 真实IMA图片字节 |
| POST /api/plans | {product_id,platform?:'xiaohongshu'或'wechat_official',goal?,hint?} ->202 {task_id,task,run,...} |
| GET /api/tasks/:id | 详情含run、persona_report、personas（同report）、selection、strategy、content、contents、verification、evidence、prepared_task |
| POST /api/tasks/:id/generate | 无请求体，从已保存段继续，202 |
| GET /api/tasks/:id/evidence | {evidence:[]} |
| GET /api/tasks/:id/evidence/:id/image | 当前真实产品图字节 |
| GET /api/tasks/:id/export?format=md或json | 附件；pending标明待核验草稿，rejected拒绝 |
| GET /api/customers | {status:'ready',customers:[]} |
| POST /api/customers | {name,needs?,stage?,next?,time?} ->201 {customer} |
| GET/PATCH /api/customers/:id | 读取/修改上述字段，{customer} |
| POST /api/customers/:id/followups | {note,task_id?} ->201 {customer} |

POST plans 后每1.5秒读取task。run.status为running/complete/failed；stage为evidence/personas/strategy/content/verify/complete。失败展示run.error.message；中间结果已保存。Workflow自动补简报、推荐人群，四阶段调用真实LLM，保留draft/pending，不写假confirmed。

旧B1和研究接口ima-search、model-confirmation、personas保持兼容。SQLite v2保存产物与版本。demo_customers持久化客户，timeline为{id,note,created_at}[]，content为{task_id}[]。客户和任务沿用现有用户隔离。

## 实际验证

API模块35项通过。真实IMA目录/图文取证/保存、225613字节图片代理且hash一致通过；真实客户新增、跟进、重新读取通过。Kimi最小JSON此前成功5489ms。首次真实画像失败原因是IMG被当事实引用，已改为画像阶段只传文字证据；完整证据保留供后续配图。修复后真实四阶段主线正在运行，最终结果见交付消息，不把已部署接口当作完整营销验证成功。

源码demo-service.mjs负责演示目录/管线/客户/导出；research-service.mjs保留研究和图片接口。前端页面、海报排版由Frontend负责。未完成客户LLM建议、自动反馈改写与浏览器整体验收，不阻塞当前产品→画像→策略→内容链路。
