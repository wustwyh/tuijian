# Agent 进度看板

本文件由 Coordinator 更新；各角色只写自己的交接文件。

## 全局事实

- 主目录：`E:\codes\创业\10.18黑客松`，主分支：`integration`。
- Git 共享结构基线已建立：`1631a12`；五个独立角色 worktree 已创建并验证。
- 已有模块目录与 package 元信息，业务应用尚未实现，尚无前后端启动命令。
- 未安装第三方依赖，没有添加 Git remote 或执行推送。
- 本地知识库、PDF/压缩包、外部分发技能、个人记忆、凭证及运行产物均被 Git 忽略。
- 原始三个项目文件未被改写；当前 API 契约仍有待冻结项。
- 线上 ima、LLM、Auth/Database 连通性尚未在本批验证。
- 正式事实与图片只能来自线上 ima，测试夹具不能冒充线上结果。

## 当前批次

Git 结构基线完成；下一步 IMA I1：线上共享库检索、Markdown 与图片读取。
G0 尚未完整通过：结构基线就绪，公共接口接缝及业务应用可启动检查待完成。

| 角色 | 任务 ID | 状态 | 分支 | worktree | 下一交付 |
|---|---|---|---|---|---|
| Coordinator | C0 | 结构基线完成；接口冻结待办 | integration | `E:\codes\创业\10.18黑客松` | 维护基线、接收 IMA、收口接口 |
| frontend | F1 | 待启动 | feat/frontend | `E:\codes\创业\10.18黑客松-worktrees\frontend` | 页面与 API 适配 |
| backend | B1 | 待启动 | feat/backend | `E:\codes\创业\10.18黑客松-worktrees\backend` | 真实身份/存储与隔离 |
| ima | I1 | 待启动 | feat/ima | `E:\codes\创业\10.18黑客松-worktrees\ima` | 线上 Markdown + 图片证据 |
| workflow | W1 | 待启动 | feat/workflow | `E:\codes\创业\10.18黑客松-worktrees\workflow` | 画像/策略/两平台生成 |
| qa | Q1 | 待启动 | test/demo | `E:\codes\创业\10.18黑客松-worktrees\qa` | 真实闭环与隔离验收 |

## 待决事项

Auth/Database 与 LLM 接入；图片访问/有效期；型号及画像确认、下游失效、导出规则。
