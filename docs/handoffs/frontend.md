# Frontend 最近交接

角色 / 分支 / worktree：交互与展示负责人 / feat/frontend / E:\codes\创业\10.18黑客松-worktrees\frontend
职责基线：roles-v2-20261018 / ea126ce。原提交 e1cde7c 和 d3575f7 保留；本次交付提交以 git log -1 -- apps/web/src/ContentPreview.js 获取。公共 seams-v1 39d15df 在本次模块提交后安全合并，具体同步 HEAD 见信箱回执。

## 本次已交付

继续已有真实 B1 适配，未重建工程。ContentPreview.js 展示公众号/小红书正文、备选标题、内容结构切换、版本、核验状态、逐图用途/位置/证据，海报说明与成品分开。核验页增加未接通的导出入口及原因；未添加复制/下载绕过服务端。图片代理未就绪，仅展示计划，不读取来源文档作为图片。

只修改 apps/web/** 和本交接；不改后端、公共契约、根配置或公共锁文件。Workflow 的 W0 ab7e3a2 已读，新增字段仍为提案；前端所需状态/确认/修订字段已回信 Coordinator/Backend/Workflow。

## 真实验证

- 13 项模块测试通过：node --test apps/web/test/api.test.js apps/web/test/model.test.js apps/web/test/preview.test.js。
- 实际 Edge 浏览器：专用本地演示账号注册→创建带自验标识的任务→刷新重读→退出→任务路由回登录，均通过，脚本异常 0。保留一个专用演示账号/任务，无产品事实或生成内容。
- 独立浏览器组件夹具：两平台预览、结构切换、证据入口、导出禁用、390px 无横向溢出，通过；已查看桌面和移动截图。夹具在临时测试脚本，不进入正式运行入口。
- 构建：默认 npm.cmd run build --workspace @huawei-demo/web 在清空既有 dist 时 Windows 原生进程退出 3221226505，重现。关闭压缩/线程限制无效。--emptyOutDir false 及输出到新临时目录均构建成功。暂未改变默认清理策略，不能声称默认构建通过。
- git diff --check 通过。

入口 http://127.0.0.1:5173/ ，后端默认 3001；启动 npm.cmd run dev --workspace @huawei-demo/web。Vite 隐藏运行，日志/PID 在 apps/web/.runtime/。

## 已对齐与依赖

B1 当前 auth/tasks envelope 与 Cookie 将按 seams-v1 正式约定接续。Frontend manifest 已有 react/react-dom/vite，Coordinator 已回信接收业务时处理公共锁文件。

信箱：
- 启动职责回执 20261018T073944Z_f3a7_role-ack。
- Backend 接口问题 20261018T073944Z_f3a7_backend-contract-request，已回复 B1 实现，B2/B3/跟进未实现。
- Workflow 交互问题 20261018T073944Z_f3a7_workflow-interaction-request，已收到 W0 规则/接口草案。
- W0 展示字段反馈见 messages/frontend 下 w0-ui-feedback 消息。

F2 输入修改/型号/画像/策略确认、F4 反馈修订/失效、F3 生成/图片代理/导出/客户保存与建议等待正式契约和真实接口；未按草案猜测端点。导出 pending/rejected 用途待用户产品取舍。无真实生成、图片代理、完整导出、双账号隔离或客户跟进验收，不等同完整比赛闭环。

下一步：同步公共 seams-v1 基线并回执；Backend/Coordinator 冻结 D1—D7 及图片 HTTP 后，逐项接通确认/执行状态/图片。收到 W4/W5 正式契约后接修订和跟进。
