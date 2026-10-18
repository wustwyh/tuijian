# FF1：前端管线与逐段接线

入口：`http://127.0.0.1:5173/#/preview/products`。登录后的默认入口 `#/products` 是正式服务状态；原有 `#/tasks` 继续消费真实 B1 接口。两种模式不共享示例记录。预览全程标识示例，刷新清空，无任何预览数据写入 API。

## 当前可操作闭环

产品搜索/分类/选择 → 一键模拟五阶段（可模拟失败/重试）→ 三个人群候选与采用 → 策略上下文 → 编辑内容/选择平台与版式 → 失效提示/示例检查 → 下载带水印 SVG。客户分支支持虚构客户新增、需求/阶段/下次动作与时间、跟进时间线、客户需求带入策略、草稿关联客户。反馈先记录，自动生成修订尚未接入。

源文件 `src/pipeline.js` 为页面与内存会话，`src/poster.js` 为无外部资源 SVG 渲染器。小红书 720×960，公众号封面 960×540；长文案预览截断，编辑框保留全文。图片缺失显示明确占位。没有生成或模拟产品外观。

## 给 Backend 的前端内部接缝（提案，非已存在 HTTP）

优先级：真实目录/图片 → 调研保存重开 → 连续生成 → 客户保存 → 正式导出。

| adapter 函数 | 最小输入 | 页面所需输出 |
|---|---|---|
| listProducts | query?, category? | status, products[{id,name,category,model,version,image?,coverage}], reason? |
| startPlan | product_id, platform（默认 xiaohongshu）, goal?, hint?, customer_id?, operation_key | task_id, revision, operations[], selection?, defaults_applied |
| getPlan | task_id | task, revision, evidence[], retrieval, persona_report, selection, strategy, contents[], verification, freshness, operations[] |
| chooseAudience | task_id, persona_id, expected_revision | revision, 服务端生成的 selection, freshness |
| reviseContent | task_id, feedback, expected_revision | revision, content, freshness, verification |
| listCustomers / saveCustomer | 客户记录与 expected_revision | 当前身份可见客户、保存后的版本 |
| appendFollowUp / linkContent | customer_id, note/next_action/next_at 或 task_id/content_id, expected_revision | 保存记录与客户版本 |
| exportCreative | task_id/content_id, expected_revision, format:svg | 服务端导出许可/拒绝原因，核验版本、图片代理引用 |

统一状态至少区分 unavailable/loading/running/failed/complete/stale，失败有 reason 与可重试范围。前端不会根据 URL 或预览样例猜测可用服务。`pipelineAdapter` 当前三个入口明确返回 unavailable，逐段替换。生成产物沿用 Workflow 原字段，在 Backend envelope 层归一化；不要重新实现推荐/核验业务规则。

最小 startPlan 输入：`{product_id:"<真实目录id>",platform:"xiaohongshu",goal:"到店体验",operation_key:"<本次操作唯一值>"}`。无需必填用户文本。系统推荐保留 source=system_recommended；前端选择不伪造 confirmed。输入、人群或内容变化需要服务端 freshness/版本信息，前端失效提示只是辅助。

正式图片必须为身份隔离的任务图片代理，附 evidence_id/media_id/model/version/fetched_at/use。没有图片或证据时保留缺失项，不替换成本地样例。正式 SVG/PNG 的发布/导出门禁由 Backend 再次检查；当前可下载 SVG 仅存在于隔离预览且带明确水印。

## 验证

Edge 自动化覆盖五入口、搜索、一键/失败/重试、采用人群、客户新增和跟进、需求带入策略、关联草稿、实时编辑、核验失效、SVG 下载、刷新清空、真实任务路由保护；1440/390px 无横向溢出，pageerror=0。截图与可重跑脚本位于 `E:\Codex\workspace\pipeline-*.png` / `verify-pipeline.mjs`，不作为运行时资产。模块测试含 SVG 转义和不同平台画布。

构建使用 `npm.cmd run build --workspace @huawei-demo/web -- --emptyOutDir false`，避免此前工作树既有 dist 清理导致的 Windows 原生崩溃；不声称默认构建问题已解决。未验证完整真实生成、图片、客户持久化和正式导出。
