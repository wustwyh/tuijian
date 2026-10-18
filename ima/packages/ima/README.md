# IMA I1 服务端客户端

Node 24、ES module、无第三方依赖。运行时只访问线上共享库“任德耀新建华为PC知识库”，不使用本地知识库。I1 仅支持解析 MateBook 14 版本候选及读取已确认的 **HUAWEI MateBook 14（鸿蒙版）**。

```js
import { retrieveProductEvidence, fetchProductImage, ImaError } from './packages/ima/index.mjs';

const result = await retrieveProductEvidence({
  query: 'MateBook 14',
  needImages: true,
  confirmedProduct: 'HUAWEI MateBook 14（鸿蒙版）',
  // knowledgeBaseId: previouslyResolvedId // Optional; exact library name is always verified.
});
if (result.status === 'ambiguous') {
  // Ask the user to choose a version. No original document/image was downloaded.
} else {
  // Backend adds id/task_id and ownership, then saves these bounded evidence records.
  // result.evidence / result.warnings
}
```

正式签名和输出类型见 `index.d.ts`。`needImages` 默认 true；`knowledgeBaseId` 未提供时按完整名称查找，0 个或多个同名库均报错；提供 ID 时仍校验库名。SDK 兼容实际线上 `kb_id/kb_name` 以及文档 `id/name` 结构，按游标分页；仅搜索指定型号，不遍历全库。

实测该库 `search_knowledge` 返回 110 个查询命中，并在终页省略 `is_end/next_cursor` 两字段；客户端按观察到的协议将“两字段同时缺失”视作终页。明确 `is_end:false` 且无游标、重复游标会失败；最多读取 20 页，单素材最多 20 MiB。此实现只承诺本次有限型号检索，不宣称提供不受限制的全库搜索。

未确认且 query 无鸿蒙版/harmonyos 标识时返回 `status: 'ambiguous'` 与线上条目支持的候选，不自动选第一型号。resolved 包含规范化证据，无业务 `id/task_id`。证据记录原查询、真实 media_id、读取时间、适用型号/版本、原文摘录和图片元数据；不包含签名 URL 或临时来源 headers。

鉴权、无结果、上游读取失败分别抛 `ImaError`：`IMA_AUTH_FAILED`、`IMA_NO_RESULT`、`IMA_FETCH_FAILED`；输入错误为 `VALIDATION_ERROR`。错误经过凭证和 URL 脱敏，`toJSON()` 可适配公共 HTTP 错误格式。上游有业务错误时保留其脱敏 `msg` 和 `upstream_code`。不把读取成功当作营销核验通过，所有 `verification_status` 均为 pending。

凭证仅在服务端读取，使用官方技能支持的环境/文件来源，并优先项目明确的 canonical 配置：`IMA_OPENAPI_CLIENTID/IMA_OPENAPI_APIKEY` → 兼容别名 `IMA_CLIENT_ID/IMA_API_KEY` → `~/.config/ima/client_id` 和 `api_key`。不向前端暴露，不把值写入代码、命令行或日志。Node 发送 UTF-8 JSON，避开 PowerShell 5.1 请求编码问题。源码直接按官方只读协议请求，不依赖外部分发技能脚本，也不执行技能自动更新/写入用户配置。

图片下载只接受 HTTPS `ima.qq.com` 或 `*.myqcloud.com`，禁止重定向；仅使用该 API 返回的 url_info.headers，绝不转发 IMA OpenAPI 凭证。检查实际 Content-Type、PNG/JPEG/WebP 文件头和尺寸，限制 20 MiB；型号依据是线上标题明确包含 matebook-14-harmonyos，发布前仍需检查颜色、具体 SKU 和素材适用权。

图片没有已验证的长期公开地址：`source_url: null`，`source_metadata.requires_refresh: true`。Backend 应提供带当前用户/任务鉴权的图片代理，凭真实证据记录调用：

```js
const image = await fetchProductImage({
  knowledgeBaseId: storedEvidence.knowledge_base_id,
  mediaId: storedEvidence.media_id,
  confirmedProduct: storedEvidence.applicable_model
});
// Respond with image.bytes and image.contentType after existing user/task access checks.
```

该函数重新验证库名、图片条目及型号并下载新地址，不把临时 URL 暴露给前端。上层负责访问控制、任务归属和缓存；本模块不持久化、不提供 HTTP 路由。Markdown 的 source_url 若存在，是原文标注的华为官方入口，未在本任务独立抓取；ima 下载链接仅用于即时读取。读取失败直接失败，不用检索摘要冒充原文。

从 worktree 根目录执行：

```powershell
node --test packages/ima/test/client.test.mjs
node packages/ima/smoke.mjs --live
```

第二条真实请求线上 API，需要已配置凭证与网络权限；成功门槛为至少一个 Markdown 原文、一个类型/尺寸校验成功的该型号图片，以及未确认型号返回 ambiguous。原始响应和下载文件只写 Git 忽略的 `.runtime/ima-latest/`；控制台只输出脱敏摘要。`examples/live-summary.json` 是一次实测的最小摘要，仅供审核/联调，客户端不会从中读取数据。

本次读取的产品资料是**产品发现卡**，可支持型号/分类/官网公开定位摘要。它明确不替代完整规格档案；处理器、内存、完整屏幕参数、续航条件、兼容性、SKU、当前价格、补贴、赠品、库存和服务承诺均待核验。请将 `warnings` 和原文边界传给 Workflow，不用摘要填补这些缺口。还未验证浏览器跨域访问、代理 HTTP 路由、缓存失效与签名有效期；应通过后端刷新代理展示。
