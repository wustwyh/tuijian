---
title: 推鉴-为销售设计的智能体
domain:
  - nlp
  - multi-modal
tags:
  - 营销智能体
  - 销售助手
deployspec:
  entry_file: app.py
license: Apache License 2.0
---

# 推鉴-为销售设计的智能体

为销售提供产品选择、客群分析、客户跟进、营销策略和平台内容制作的网站。

创空间入口：`app.py`。Python 托管已构建的 React 页面，监听 `0.0.0.0:7860`，无需在线安装 Node.js 或重新构建。

```bash
python app.py
```

页面源码位于 `frontend/apps/web`，部署产物位于 `site/`。`/healthz` 用于检查启动状态。

当前部署使用已有前端的产品目录、方案编排、编辑与 SVG 海报导出；客户记录保留于当前会话。此部署入口尚未接入 IMA/LLM 或账号 API。原有各角色源码目录保持保留。启动仅需 Python 标准库，无新增软件依赖。

修改页面后重新构建：

```bash
cd frontend/apps/web
npm install
npm run build -- --outDir ../../../site --emptyOutDir false
```
