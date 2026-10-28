@echo off
chcp 65001 >nul
setlocal
title 上传 tuijian-web 到魔搭创空间

echo ============================================================
echo  正在把 tuijian-web 推送到魔搭创空间
echo  仓库: https://www.modelscope.cn/studios/wyh666a/tuijian.git
echo ============================================================
echo.
echo 稍后会依次提示输入：
echo   1. 魔搭用户名（填 wyh666a）
echo   2. 访问令牌（输入时屏幕上不会有任何显示，属正常现象）
echo.
echo 令牌请到魔搭「账号设置 - 访问令牌」生成，用完记得回收。
echo.
pause

set "PS_EXE=powershell"
where pwsh >nul 2>nul
if not errorlevel 1 set "PS_EXE=pwsh"

"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0push-to-modelscope.ps1" -RepoUrl https://www.modelscope.cn/studios/wyh666a/tuijian.git

echo.
echo ============================================================
echo 结束。若上面出现「推送完成」，请刷新创空间页面确认文件已出现。
echo ============================================================
pause
