# 华为 PC 营销智能体 Demo

新 Agent 从 `AGENTS.md` 开始，只读分配角色所需上下文。

## 当前基线

这是共享结构与协作基线，业务应用尚未实现，尚无前后端启动命令。
Node.js 要求 >=22，当前机器已验证 Node.js 24 与 npm 11 可用。
本批未安装任何第三方依赖。根依赖与锁文件由 Coordinator 统一维护。

| 路径 | 所有者 |
|---|---|
| `apps/web/` | Frontend |
| `apps/api/` | Backend |
| `packages/ima/` | IMA |
| `packages/workflow/` | Workflow |
| `packages/contracts/` | Coordinator |
| `tests/e2e/` | QA |

角色分支和绝对 worktree 路径见 `docs/agent-status.md`。
这里只在本地创建 Git 仓库和分支；没有添加远程仓库或推送。

## 本地参考与运行时边界

原主目录的两个知识库、压缩包、PDF、ima 技能分发包和个人工具记忆不进入 Git。
IMA Agent 通过任务包中的主目录绝对路径读取外部技能文档，不依赖把资料复制到各 worktree。
正式运行从线上 ima 获取事实/图片；证据和诊断产物存入忽略的 `.runtime/`，不能把本地材料充当线上来源。
凭证由后端环境变量提供，`.env.example` 仅列变量名，不含任何值。
