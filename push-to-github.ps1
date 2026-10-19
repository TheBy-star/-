# 一键推送到 GitHub
#
# 用法（在 forest-cabin-repo 目录里，右键 PowerShell）：
#   .\push-to-github.ps1 -RepoUrl "https://github.com/你的用户名/forest-cabin.git"
#
# 前提：
#   1. 已安装 Git（https://git-scm.com/download/win）
#   2. 已在 GitHub 上创建了一个空仓库（不要勾选 README / .gitignore / LICENSE）
#   3. 网络能访问 github.com（企业网络/校园网可能被拦，用手机热点最稳）

param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl,

    [string]$Branch = "main",
    [string]$Message = "feat: 森林小屋 3D 场景（零依赖 WebGL2 实现）"
)

$ErrorActionPreference = "Stop"

Write-Host "=== 检查环境 ===" -ForegroundColor Cyan
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "未找到 git，请先安装：https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
git --version

# 未配置身份时给出明确提示，避免提交失败
$userName = git config --global user.name
$userEmail = git config --global user.email
if (-not $userName -or -not $userEmail) {
    Write-Host "尚未配置 Git 身份，请先执行：" -ForegroundColor Yellow
    Write-Host '  git config --global user.name "你的名字"'
    Write-Host '  git config --global user.email "你的邮箱"'
    exit 1
}

Write-Host "`n=== 初始化仓库 ===" -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init
}
git branch -M $Branch

Write-Host "`n=== 暂存并提交 ===" -ForegroundColor Cyan
git add -A
git status --short
git commit -m $Message

Write-Host "`n=== 关联远程并推送 ===" -ForegroundColor Cyan
$existing = git remote
if ($existing -contains "origin") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}
git push -u origin $Branch

Write-Host "`n完成！仓库地址：" -ForegroundColor Green
Write-Host $RepoUrl
Write-Host "`n提示：若要在 GitHub Pages 上在线预览，进入仓库 Settings → Pages，"
Write-Host "      Source 选择 'Deploy from a branch'，分支选 $Branch / root，保存后等待 1-2 分钟。"
