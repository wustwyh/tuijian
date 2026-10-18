# 华为 PC 营销智能体 Demo

新 Agent 从 `AGENTS.md` 按角色读取，职责基线为 roles-v2-20261018；Coordinator 兼 IMA，不设独立 QA。

主工作树 `integration` 已接收真实线上 IMA 客户端和最小公共契约。Node.js >=24。运行 `npm.cmd run test:ima` 验证模块；真实线上调用及凭证说明见 `packages/ima/README.md`。
Frontend、Backend、Workflow 已有独立分支成果，尚未合入本主工作树；前端现有本地入口为 http://127.0.0.1:5173/，不代表生成闭环已通过。详细提交、验证范围与下一交付见 `docs/agent-status.md`、`docs/next-batch.md`。

| 路径 | 所有者 |
|---|---|
| apps/web | Frontend |
| apps/api | Backend |
| packages/workflow | Workflow |
| packages/ima、packages/contracts、根配置/锁文件、tests/e2e | Coordinator |

公共接口以 `docs/api-contract.md` 为准，类型在 `packages/contracts/index.d.ts`。Frontend 的既有 React/Vite 依赖将在接收该分支时统一生成根锁文件，当前主工作树不声称完成依赖安装。
共享通信协议见 `docs/communication.md`；信箱不自动推送。Git 仅本地使用，无 remote 或推送。

事实/图片只从线上共享 IMA 获取。本地知识库、外部技能分发包、PDF/ZIP、个人记忆、凭证、原始响应和临时素材不进入 Git；`.runtime/` 只用于忽略的运行产物，不能作为线上来源。凭证仅在服务端使用。
