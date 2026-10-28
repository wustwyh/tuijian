# 魔搭创空间：改用 Git 推送（替代网页上传文件夹）

## 为什么放弃网页上传

网页版「上传文件夹」的实际流程是：把每个文件单独 `PUT` 到阿里云 OSS 临时桶
（`studio-git-temp-files/folder/<uuid>/...`），全部成功后再提交成一次 git commit。

因此报错

```
XHR error (req "error"), PUT https://modelscope-studios.oss-cn-zhangjiakou.aliyuncs.com/
studio-git-temp-files/folder/<uuid>/src/pages/CreatePlatform.jsx
-1 (connected: false, keepalive socket: false)
```

不是代码、Dockerfile 或依赖的问题，而是**逐文件上传在传输层就断了**：

- `-1` 是 XHR 的 `onerror`，`connected: false` 表示 TCP 连接根本没建立，一个 HTTP 状态码都没拿到。
- 可以排除：文件过大被拒（会回 4xx）、令牌/签名过期（403）、CORS（会有状态码与控制台 CORS 提示）。

本项目 `knowledge` 有 1311 个文件（约 29.4 MiB）。如果拖入的是整个 `tuijian-web`
文件夹，还会带上 `node_modules` —— 通常是**数万个文件**。这么多并发 PUT 会把浏览器
和 OSS 的连接池耗尽，于是从某个文件开始后续请求全部 `connected: false`。

Git 推送一次传输整个仓库，与文件数量无关，是这类项目的正确做法。

## 步骤

### 1. 拿到仓库地址和访问令牌

- 打开创空间页面 → 「Git」选项卡 → 复制仓库地址，形如
  `https://www.modelscope.cn/studios/<用户名>/<创空间名>.git`
- 魔搭「设置 → 访问令牌」生成一个**统一访问令牌**。
  令牌不要写进脚本、不要提交、不要发给别人。

> **认证格式（实测最容易踩的坑）**：git 认证的**用户名必须固定写 `oauth2`**：
> `https://oauth2:<令牌>@www.modelscope.cn/studios/<用户名>/<创空间名>.git`
>
> 写成 `<账号名>:<令牌>` 会持续返回
> `remote: HTTP Basic: Access denied. The provided password or token is incorrect...`
>
> 而且此时 **`git clone` / `git ls-remote` 依然成功**（公开仓库匿名就能读），
> 很容易误判成“令牌没有写权限”或“需要另一种 Git 令牌”。
> 记住症状：**读正常、只有 push 401 → 先查用户名是不是 `oauth2`**。

### 2. 运行脚本

```powershell
cd 'E:\codes\创业\10.18黑客松\tuijian-web'
.\scripts\push-to-modelscope.ps1 -RepoUrl https://www.modelscope.cn/studios/<用户名>/<创空间名>.git
```

脚本会依次：

1. 克隆（或复用）到 `%TEMP%\ms-space`，**完全不去碰父目录那个状态很乱的仓库**；
2. 只复制白名单内容；
3. 强制删除 `node_modules`、`dist`、`data`、`.tmp` 和除 `.env.example` 外的所有 `.env*`，
   删不掉就中止；
4. 统计文件数与体积，超过 20 MiB 的单文件给出警告；
5. 断言根目录必须直接含 `Dockerfile`、`package.json`、`package-lock.json`、
   `vite.config.js`、`index.html`、`src`、`server`、`knowledge`；
6. 提交并推送到远端默认分支（空仓库默认 `master`）；
7. 推送成功后把带令牌的 URL 从 `origin` 里抹掉。

想先演练、不推送：

```powershell
.\scripts\push-to-modelscope.ps1 -RepoUrl <地址> -SkipPush
```

### 3. 构建前配置

在创空间「设置 → 环境变量」填：

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`

`KNOWLEDGE_ROOT=/app/knowledge` 已写在 Dockerfile 里，无需重复配置。

### 4. 构建与验收

点「构建」，日志中确认 `vite build` 成功、服务监听 `0.0.0.0:7860`。
起来后依次检查：首页加载、产品列表 10 个、产品封面图、客户/素材推荐、
一次完整图文生成、图文 ZIP 下载。

## 上传内容的白名单

| 上传 | 说明 |
|---|---|
| `Dockerfile`、`package.json`、`package-lock.json`、`vite.config.js`、`index.html` | 构建必需 |
| `src`、`server`、`public` | 前后端代码与静态资源 |
| `knowledge` | 运行必需的本地库，约 1311 文件 / 29.4 MiB |
| `.dockerignore`、`.gitignore`、`.env.example` | 配置样例 |
| `docs` | 文档，可选 |

| 禁止上传 | 原因 |
|---|---|
| `node_modules` | 数万文件，会直接拖垮上传；云端 `npm ci` 会装 |
| `dist` | 云端构建产生 |
| `data` | 本地运行记录与用户数据；云端首次启动自动建库 |
| `.env`、`.env.*` | 含密钥 |
| `.tmp`、`*.log` | 临时与日志 |

## 注意

- 网页上传**不遵守 `.dockerignore`**，必须靠脚本或手工排除。
- 云端没有持久存储时，实例重建会丢失运行期间新增的数据；本地历史与自定义上传数据不会自动迁移。
- 推送成功后刷新创空间页面确认根目录**直接**能看到 `Dockerfile` 等文件，不要多套一层 `tuijian-web`。
