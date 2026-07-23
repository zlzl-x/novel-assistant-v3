# 发布到 GitHub：源码推 main，安装包传 Releases
# 使用前请先执行：gh auth login
param(
  [string]$Version = "0.0.1",
  [string]$Owner = "",
  [string]$Repo = "novel-assistant-v3"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "未安装 GitHub CLI。请运行：winget install GitHub.cli"
}

gh auth status | Out-Null

if (-not $Owner) {
  $Owner = (gh api user -q .login)
}

Write-Host "==> 构建 Windows 安装包..."
pnpm --filter @novel-assistant/desktop build:installer

$Installer = Get-ChildItem "apps/desktop/dist" -Filter "*Setup*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $Installer) {
  throw "未找到安装包，请检查 apps/desktop/dist/"
}

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

git add .
git commit -m "chore: release v$Version" 2>$null

$remote = "https://github.com/$Owner/$Repo.git"
if (-not (git remote get-url origin 2>$null)) {
  git remote add origin $remote
}

if (-not (gh repo view "$Owner/$Repo" 2>$null)) {
  Write-Host "==> 创建 GitHub 仓库 $Owner/$Repo ..."
  gh repo create $Repo --public --source=. --remote=origin --push
} else {
  git push -u origin main
}

gh release create "v$Version" $Installer.FullName `
  --repo "$Owner/$Repo" `
  --title "v$Version" `
  --notes "Windows 安装包。API Key 请在应用设置中自行配置，不会包含在安装包内。"

Write-Host "完成： https://github.com/$Owner/$Repo/releases/tag/v$Version"
