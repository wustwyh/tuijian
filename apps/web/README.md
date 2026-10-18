# @huawei-demo/web

Frontend F1 页面与工作台骨架。所有业务数据由后端读取；生产入口没有测试夹具、浏览器持久化、伪造登录或本地知识库回退。

## 当前交付

- `#/login`：登录表单、刷新时会话检查、真实失败提示。
- `#/tasks`：当前用户任务列表、状态筛选、刷新、创建任务原生模态框。
- `#/tasks/:taskId`：任务 / 画像 / 策略 / 内容 / 核验五标签，方向键与 Home/End 切换；任务页包含场景判断和知识依据。
- `#/leads`：后续批次占位，不录入真实客户信息。
- 未登录不渲染业务页面；退出立即卸载用户数据；会话过期退回登录；请求取消以阻止旧响应恢复已退出用户的数据。
- 证据显示来源、media_id、知识库、型号、读取时间、核验状态；不把来源文档 URL 当作图片直链。

## 启动条件与命令

Coordinator 需要批准并添加 `react`、`react-dom`、`vite` 三项依赖，统一维护根配置与锁文件。本次没有修改根配置、锁文件或安装依赖。

依赖安装及后端同源 `/api` 代理配置完成后，在仓库根目录执行：

```powershell
npm run dev --workspace @huawei-demo/web
npm run build --workspace @huawei-demo/web
```

仅含纯 Node 测试的验证命令无需第三方依赖，在 `apps/web` 执行：

```powershell
node --test test/api.test.js test/model.test.js
```

## API 接入

`src/api.js` 只调用已在契约列出的任务及证据端点：

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:taskId`
- `GET /api/tasks/:taskId/evidence`

`src/integration.js` 中等待 Coordinator 冻结的两组适配：

1. `auth.session/login/logout`：通过传入的 `request` 调用正式鉴权端点，使用 `signal` 支持取消。`session` 返回有效用户或 `null`，`login` 返回含 `id` 的有效用户，`logout` 等待服务端确认。登录表单传入的 `credentials.account/password` 是前端参数，由适配函数映射到正式字段。没有猜测后端路径或请求字段。
2. `responses.tasks/task/detail/evidence`：把后端真实响应转换为本地页面模型。`detail` 的 `{task, personas, strategy, contents, verification}` 仅为前端视图模型；不是新增公共响应契约。任务、证据数组不得伪造用户数据或来源。

适配未配置时返回 `INTEGRATION_PENDING`，不发猜测路径的请求、不伪装为登录成功或空列表。当前未完成端到端联调。

## 后续接缝

注册、型号候选确认、画像选择确认、生成操作、修改输入后下游失效、图片直链及有效期、导出阻断规则等待统一契约；当前工作台仅展示后端已有结果，任务输入只读。切换人群或平台通过新建独立任务完成，避免错误重用旧结果。

可复现交互验收：配置正式适配与依赖 → 登录 → 创建任务 → 打开工作台 → 查看五标签和证据 → 刷新恢复 → 退出 → 直接访问任务地址应回到登录。真实账号隔离必须配合后端双账号验收；纯前端测试不等于隔离或真实闭环通过。
