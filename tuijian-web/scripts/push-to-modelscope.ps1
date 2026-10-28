<#
.SYNOPSIS
    把 tuijian-web 精简后的内容推送到魔搭 Docker 创空间的 Git 仓库。

.DESCRIPTION
    绕开网页版「上传文件夹」逐文件 PUT 到 OSS 的做法：
    网页上传会给每个文件单独发一个请求，本项目含 knowledge 1300+ 文件，
    若误把 node_modules 一起拖进去（数万文件）会耗尽浏览器与 OSS 的连接池，
    症状就是 `PUT ... -1 (connected: false)`。Git 推送一次传输，与文件数无关。

    本脚本只复制白名单内容，强制清除 .env / node_modules / dist / data，
    token 不回显、不落盘，git 报错信息中的凭据会被脱敏。

.EXAMPLE
    # 在 tuijian-web 目录下执行
    .\scripts\push-to-modelscope.ps1 -RepoUrl https://www.modelscope.cn/studios/我的用户名/我的创空间.git

.EXAMPLE
    # 只演练（克隆 + 复制 + 统计，不提交不推送）
    .\scripts\push-to-modelscope.ps1 -RepoUrl https://www.modelscope.cn/studios/u/s.git -SkipPush
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl,

    # tuijian-web 根目录，默认取脚本上一级
    [string]$Source = (Split-Path -Parent $PSScriptRoot),

    # 本地克隆位置
    [string]$WorkDir = (Join-Path $env:TEMP 'ms-space'),

    # 目标分支，留空则自动判断
    [string]$Branch,

    # 只演练，不提交不推送
    [switch]$SkipPush
)

$ErrorActionPreference = 'Stop'

function Add-Step([string]$line) { Write-Host $line }

# ---------- 脱敏调用 git ----------
$script:authUrl = $null
$script:token   = $null

function Invoke-GitSafe {
    param(
        [Parameter(Mandatory = $true)][string[]]$GitArgs,
        [switch]$AllowFail
    )

    $out  = & git @GitArgs 2>&1
    $code = $LASTEXITCODE

    foreach ($line in $out) {
        $text = $line.ToString()
        if ($script:token)   { $text = $text.Replace($script:token, '***') }
        if ($script:authUrl) { $text = $text.Replace($script:authUrl, $RepoUrl) }
        Write-Host "  $text"
    }

    if ($code -ne 0 -and -not $AllowFail) {
        throw ("git {0} 失败（退出码 {1}）" -f $GitArgs[0], $code)
    }
    return $code
}

# ---------- 0. 前置检查 ----------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw '未找到 git。请先安装 Git for Windows 并确保 git 在 PATH 中。'
}
if ($RepoUrl -notmatch '^https://') {
    throw "RepoUrl 必须以 https:// 开头，当前为：$RepoUrl"
}

$Source = (Resolve-Path $Source).Path
if (-not (Test-Path (Join-Path $Source 'Dockerfile'))) {
    throw "Source 不像 tuijian-web 根目录（找不到 Dockerfile）：$Source"
}

Write-Host ''
Add-Step "来源目录 : $Source"
Add-Step "克隆目录 : $WorkDir"
Add-Step "创空间库 : $RepoUrl"
Write-Host ''

# ---------- 1. 采集凭据（不回显、不落盘） ----------
# 魔搭 git 认证的用户名固定为 oauth2；填账号名或空间名都会 401 Access denied
$user = 'oauth2'

$sec = Read-Host '统一访问令牌（输入时不回显，在魔搭「设置 → 访问令牌」生成）' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
try {
    $script:token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
if ([string]::IsNullOrWhiteSpace($script:token)) { throw '访问令牌不能为空。' }

$script:authUrl = $RepoUrl -replace '^https://', (
    'https://oauth2:{0}@' -f [uri]::EscapeDataString($script:token)
)

# ---------- 2. 克隆或复用 ----------
Write-Host ''
if (Test-Path (Join-Path $WorkDir '.git')) {
    Add-Step '[1/6] 复用已有克隆，先 pull'
    Invoke-GitSafe -GitArgs @('-C', $WorkDir, 'pull', '--ff-only') -AllowFail | Out-Null
}
else {
    if (Test-Path $WorkDir) {
        Add-Step '[1/6] 目标目录非空，清理后重新克隆'
        Remove-Item $WorkDir -Recurse -Force
    }
    Add-Step '[1/6] git clone'
    Invoke-GitSafe -GitArgs @('clone', $script:authUrl, $WorkDir) | Out-Null
}

# ---------- 3. 只复制白名单 ----------
$items = @(
    'Dockerfile'
    'package.json'
    'package-lock.json'
    'vite.config.js'
    'index.html'
    'src'
    'server'
    'public'
    'knowledge'
    '.dockerignore'
    '.gitignore'
    '.env.example'
    'docs'
)

Add-Step '[2/6] 复制白名单内容'
foreach ($item in $items) {
    $p = Join-Path $Source $item
    if (-not (Test-Path $p)) {
        Write-Warning "  源目录缺少 $item，已跳过"
        continue
    }
    Copy-Item -Path $p -Destination $WorkDir -Recurse -Force
    Write-Host "  + $item"
}

# ---------- 4. 强制清除绝不能上传的东西 ----------
Add-Step '[3/6] 清除敏感/冗余内容'
$forbidden = @('node_modules', 'dist', 'data', '.tmp', '.git-tmp')
foreach ($f in $forbidden) {
    $p = Join-Path $WorkDir $f
    if (Test-Path $p) {
        Remove-Item $p -Recurse -Force
        Write-Host "  - $f"
    }
}

# 所有 .env* 一律删除，仅保留 .env.example
Get-ChildItem -Path $WorkDir -Filter '.env*' -Force -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.env.example' } |
    ForEach-Object {
        $rel = $_.FullName.Substring($WorkDir.Length).TrimStart('\')
        Remove-Item $_.FullName -Recurse -Force
        Write-Host "  - $rel"
    }

# 兜底断言
foreach ($must in @('.env', 'node_modules')) {
    $leftover = Join-Path $WorkDir $must
    if (Test-Path $leftover) { throw "仍存在 $must，已中止：$leftover" }
}

# ---------- 5. 统计并显示 ----------
Add-Step '[4/6] 统计待提交内容'
$files = @(Get-ChildItem -Path $WorkDir -Recurse -File -Force |
    Where-Object { $_.FullName -notmatch '\\\.git\\' })
$bytes = 0
if ($files.Count -gt 0) {
    $sum = $files | Measure-Object -Property Length -Sum
    if ($sum.Sum) { $bytes = [double]$sum.Sum }
}
Add-Step ("  文件数 : {0}" -f $files.Count)
Add-Step ("  总大小 : {0:N1} MiB" -f ($bytes / 1MB))

$big = @($files | Where-Object { $_.Length -gt 20MB })
if ($big.Count -gt 0) {
    Write-Warning '以下文件超过 20 MiB，魔搭可能拒绝，建议先压缩或排除：'
    foreach ($b in $big) {
        Write-Warning ("  {0:N1} MiB  {1}" -f ($b.Length / 1MB), $b.Name)
    }
}

# 顶层结构自检：根目录必须直接看到这些
$mustTop = @('Dockerfile', 'package.json', 'package-lock.json', 'vite.config.js', 'index.html', 'src', 'server', 'knowledge')
$missing = @($mustTop | Where-Object { -not (Test-Path (Join-Path $WorkDir $_)) })
if ($missing.Count -gt 0) {
    throw ("根目录缺少必需项：{0}。魔搭构建会失败，已中止。" -f ($missing -join ', '))
}
Add-Step '  根目录结构检查通过'

# ---------- 6. 提交与推送 ----------
Add-Step '[5/6] 暂存并提交'
Invoke-GitSafe -GitArgs @('-C', $WorkDir, 'add', '-A') | Out-Null
Invoke-GitSafe -GitArgs @(
    '-C', $WorkDir,
    '-c', "user.name=$user",
    '-c', "user.email=$user@users.noreply.modelscope.cn",
    'commit', '-m', 'deploy: tuijian-web Docker 创空间'
) -AllowFail | Out-Null

if ($SkipPush) {
    Add-Step "[6/6] 已跳过推送（-SkipPush）。检查 $WorkDir 后可用 git push 手动推送。"
    exit 0
}

# 目标分支：能从远端读到就用远端的，空仓库默认 master
if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = 'master'
    $symref = & git -C $WorkDir ls-remote --symref origin HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $symref -match 'refs/heads/(\S+)') {
        $Branch = $Matches[1]
    }
}

& git -C $WorkDir rev-parse --verify HEAD 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    # 空仓库还没有任何提交，先指向目标分支
    & git -C $WorkDir symbolic-ref HEAD "refs/heads/$Branch" 2>$null | Out-Null
}

Add-Step ("[6/6] 推送到 origin/{0}（首次约 29 MiB，可能耗时 1-3 分钟）" -f $Branch)
Invoke-GitSafe -GitArgs @('-C', $WorkDir, 'push', $script:authUrl, "HEAD:$Branch")

# 把带令牌的 URL 从配置里抹掉
& git -C $WorkDir remote set-url origin $RepoUrl 2>$null | Out-Null

Add-Step ''
Add-Step '推送完成。接下来：'
Add-Step '  1. 刷新创空间页面，确认根目录直接看到 Dockerfile / package.json / src / server / knowledge'
Add-Step '  2. 创空间「设置 → 环境变量」填 DEEPSEEK_API_KEY、DEEPSEEK_MODEL'
Add-Step '  3. 点「构建」，等日志出现 vite build 完成、服务监听 7860'
Write-Host ''
Write-Host '请把上面从 [1/6] 开始到结尾的输出贴回来，我据此确认云端状态。' -ForegroundColor Cyan
