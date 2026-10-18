# Coordinator + IMA 接续 — C1 / seams-v1-20261018

- 已读新版入口、角色、看板、职责切换与通信规则；本会话为唯一合并角色，不新建 IMA/QA。
- 已接收旧 IMA 停写消息，保留 8 个暂存文件原内容并审核提交 `8f62c32`，ff 合入 integration。18 项离线测试本次全通过；此前真实文档/图片/刷新/歧义记录见 IMA 交接和最小脱敏摘要。
- 已发布 API §8 和共享类型，冻结 B1 身份/任务、IMA 模块与 LLMAdapter；根 Node 要求对齐 >=24。角色回执及双方接缝意见经共享信箱接收。
- 发现并通知 Workflow：真实 IMG source_url:null 会被旧 remoteUrl 校验拒绝；由 Workflow 自己修复，Coordinator 不代改。
- 尚未合入 Frontend/Backend/Workflow 业务分支；未生成公共锁文件；缺服务端 LLM key，真实 LLM/完整生成闭环尚未验证。Backend 接续 B4/B5，Workflow 接续 W0，Frontend 可继续既有结构预览。
- 已收到并定向评估 W0 草案 ab7e3a2；已发正式契约提交 39d15df 通知、IMA 精确类型/真实摘要路径、Backend 图片/确认接口请求并填写回执。消息 `20261018T074700Z_c2-seams-v1-published`。
- 下一可验收动作：Backend 回 D1—D7 与图片 HTTP 草案，Workflow 自验真实来源格式修复；收口确认/失效接口后逐提交集成。导出产品取舍仍待决定。见 `docs/next-batch.md`。
- 原子信箱消息及回执见 `E:\Codex\workspace\hackathon-agent-mailbox`；仅讨论不等于正式契约。旧记录保留在下方。

---

# Coordinator 最近交接

## 职责切换 v2

- 职责基线：`roles-v2-20261018`，Coordinator 兼 IMA；Workflow 主导营销业务逻辑；Backend/Frontend 自验；独立 QA 暂停，用户最终验收。
- 本批交付：统一入口、四角色任务包、旧角色迁移说明、看板、接缝责任、共享信箱协议与验收责任。
- 已检查：各工作树 Git 状态、已有业务提交和相关交接；Frontend/Backend/Workflow 已有提交，旧 IMA 有未提交代码；原看板已过时。
- 本批不重跑业务测试、不证明真实服务已接通；各模块测试记录见各分支自己的历史交接。
- 同步：基线标签可定位确切提交；各工作树用合并接收。实际同步完成与保留检查由执行回执提供，不能仅凭本文件认定完成。
- 下一步：读取共享信箱回执，收到旧 IMA 停写交接后接管实现；收口三个已有模块的最小接口和依赖，继续 I1/真实闭环。
- 通信：`E:Codexworkspacehackathon-agent-mailbox`，协议见 `docs/communication.md`；消息不自动推送。

## 历史交接：C0（原文保留，旧调度已由 v2 替代）

- 任务：C0，共享结构基线与独立 worktree。
- 结构基线提交：`1631a12`；当前集成提交用 `git rev-parse HEAD` 获取。
- 已完成：显式 Git 跟踪清单、忽略规则、模块所有权目录、五个角色分支/worktree。
- 已验证：Git 忽略凭证/本地资料/运行产物，各 worktree 指向同一集成基线且工作区干净。
- 尚未完成：共享接口接缝冻结、运行应用、第三方依赖安装、真实线上服务。
- 下一步：启动 IMA I1，读取技能知识库模块并验证线上 Markdown 与产品图；其他业务 Agent 暂未启动。
- 外部技能入口：`E:\codes\创业\10.18黑客松\ima-skills-1.1.10\ima-skill\SKILL.md`。
