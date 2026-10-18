# IMA I1 交接

角色 / 分支 / worktree：IMA Agent / `feat/ima` / `E:\codes\创业\10.18黑客松-worktrees\ima`。

任务：I1，基线 `ac4aa35`，由 Coordinator 确认内部 `status: resolved | ambiguous` 接缝。只改 `packages/ima/**` 与本文件，无根依赖/配置/公共契约变更，无远程推送。本文件与模块同次提交，提交号见 `git log -1 -- packages/ima docs/handoffs/ima.md`。

## 交付入口

- `packages/ima/index.mjs`、`index.d.ts`：无第三方依赖的 Node 24 服务端客户端。
- `retrieveProductEvidence({query, needImages=true, confirmedProduct?, knowledgeBaseId?})`：resolved 返回 `product/knowledgeBaseId/evidence/warnings`；ambiguous 返回线上支持的 `candidates`，不读取原文/图片；错误抛 `ImaError`。
- `fetchProductImage({knowledgeBaseId?, mediaId, confirmedProduct})`：再次校验共享库名称、图片归属与型号，刷新并返回 `bytes/contentType/imageMetadata/fetchedAt`，供 Backend 的鉴权图片代理使用。
- `packages/ima/README.md`：调用示例、凭证优先级、图片代理接入、错误与事实边界。
- `packages/ima/smoke.mjs`：必须显式 `--live`，真实 API smoke，不读取静态样例。
- `packages/ima/examples/live-summary.json`：2026-10-18 单次线上实测的脱敏最小摘要，仅审核/联调，不是运行时数据源。

Backend 分配业务 `id/task_id` 与用户归属。所有来源证据默认 `verification_status: pending`，模块仅检查来源读取、型号关联、内容类型、编码/图片文件头和尺寸，不承担最终营销事实核验。

## 已执行的验证

从 worktree 根运行：

```powershell
node --test packages/ima/test/client.test.mjs
node packages/ima/smoke.mjs --live
```

- 离线 18/18 通过：协议形状、无结果、缺凭证/权限错误、敏感错误脱敏、指定库校验、原文缺失、素材域限制、PNG/MIME/尺寸、分页、近似型号拒绝、刷新接口成功/拒绝等。
- 模块真实线上 smoke 通过，完成时间 `2026-10-18T07:19:29.636Z`。指定共享库精确匹配“任德耀新建华为PC知识库”；无本地知识库数据参与。
- `02-HUAWEI MateBook 14（鸿蒙版）.md`：真实 API media_id 见摘要，UTF-8 `text/markdown`，6919 bytes，SHA256 `f00c695c266e6fffb3f2156271491326c27331829946ae9cddc45f5baa364339`。
- `vmall_matebook-14-harmonyos_原野绿正面产品展示_09.png`：`image/png`，PNG 文件头，800×800，225613 bytes，SHA256 `793fe65d16b209f47f162537955c4c288be35000916105038b40cf4ebb81ce7d`；Coordinator 亦独立查看并确认视觉正常。
- `fetchProductImage` 已再次真实下载该图，SHA256 与初次读取一致；未确认 `MateBook 14` 真实返回鸿蒙版/酷睿 Ultra 两候选。
- 凭证仅检查配置状态：canonical 两变量均有进程环境配置。PowerShell 5.1 已检测，请求均由 Node UTF-8 JSON 发送；首发沙箱网络 EACCES，按规范提权后成功。

最初模块 live 发现实际 `search_knowledge` 终页只有 `info_list`（110 条），省略 `is_end/next_cursor`；已兼容并新增回归测试后重跑通过。明确非终页缺游标/重复游标仍失败，最多 20 页，不宣称无限制全库完整检索。另兼容实际知识库搜索的 `kb_id/kb_name`。

## 接入与未验证边界

原文明确是**产品发现卡**，仅可支持型号、分类和官网公开定位摘要。精确配置、SKU、续航测试条件、软件兼容、动态价格/补贴/库存/赠品/服务承诺待核验，不得用卡片补齐。该限制随原文摘录及 warnings 返回，应传给 Workflow。

Markdown `source_url` 为原文标注的华为官方入口，未独立抓取核验；图片 `source_url: null`，以真实 media_id 和 fetched_at 追溯。ima 返回的临时 URL 与素材签名 headers 不进业务持久化/Git/前端；后端按 media_id 刷新代理，API 凭证绝不携带到素材域名。当前素材域为 `skb.ima.myqcloud.com`。

原始 API 响应、原文和图仅存 `.runtime/ima-latest/`（Git 忽略）；该目录不随提交分发。上层用户/任务鉴权、HTTP 代理路由、浏览器展示、缓存失效、签名有效期尚未验证。模块仅 I1 单型号范围，后续型号需独立扩展与验证。

下一步：Coordinator 合入后，Backend 连接两函数、添加证据业务 ID 与所有权，接通图片代理；Workflow 使用原文发现卡边界进行营销事实核验。
