# Dev local - hot reload no front (Next.js) e BFF (Nest watch).
# Docker aqui e so Postgres + Redis; os apps sempre rodam nativos.
#
# Uso:
#   .\scripts\dev-local.ps1              # infra + todos os servicos em dev
#   .\scripts\dev-local.ps1 -WebOnly     # so web (backend ja de pe)
#   .\scripts\dev-local.ps1 -SkipInfra   # pula docker (Postgres/Redis ja rodando)
#
# UI com HMR: http://localhost:3000

param(
  [switch]$WebOnly,
  [switch]$SkipInfra,
  [switch]$SkipJava
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Test-Port([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Port([int]$Port, [int]$Seconds = 90) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Port $Port) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Start-Logged([string]$Name, [string]$FilePrefix, [string]$Command) {
  $logDir = Join-Path $Root ".tmp/local-stack"
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $out = Join-Path $logDir "$FilePrefix.out.log"
  $err = Join-Path $logDir "$FilePrefix.err.log"
  Write-Host "-> $Name (logs: $out)"
  Start-Process -FilePath "powershell.exe" -WorkingDirectory $Root -ArgumentList @(
    "-NoProfile", "-Command",
    "$Command *>> '$out' 2>> '$err'"
  ) -WindowStyle Hidden | Out-Null
}

Write-Host ""
Write-Host "Arinelli Pay - dev local (hot reload)" -ForegroundColor Yellow
Write-Host ""

if (-not $SkipInfra) {
  Write-Host "Subindo Postgres + Redis (docker compose)..."
  docker compose up -d
  if (-not (Wait-Port 5433) -or -not (Wait-Port 6380)) {
    throw "Postgres (5433) ou Redis (6380) nao subiu a tempo."
  }
  Write-Host "  Postgres :5433 e Redis :6380 OK" -ForegroundColor Green
} else {
  Write-Host "SkipInfra: assumindo Postgres :5433 e Redis :6380 ja de pe."
}

if ($WebOnly) {
  Write-Host ""
  Write-Host "Modo WebOnly - backend deve estar rodando (8081/8082/8090/8083/3001)." -ForegroundColor DarkYellow
} elseif (-not $SkipJava) {
  if (-not (Test-Path "services/billing-core/target/billing-core-0.1.0-SNAPSHOT.jar")) {
    Write-Host "Build Java (primeira vez)..."
    & .\mvnw.cmd package -DskipTests -q
  }
  if (-not (Test-Path "services/workers/workers.exe")) {
    Write-Host "Build worker Go..."
    go -C services/workers build -o workers.exe .
  }

  $javaServices = @(
    @{ Port = 8081; Name = "billing-core"; Cmd = "java -jar services/billing-core/target/billing-core-0.1.0-SNAPSHOT.jar" },
    @{ Port = 8082; Name = "payments-core"; Cmd = "java -jar services/payments-core/target/payments-core-0.1.0-SNAPSHOT.jar" },
    @{ Port = 8090; Name = "gateway"; Cmd = "java -jar services/gateway/target/gateway-0.1.0-SNAPSHOT.jar" }
  )
  foreach ($svc in $javaServices) {
    if (-not (Test-Port $svc.Port)) {
      Start-Logged $svc.Name $svc.Name $svc.Cmd
      if (-not (Wait-Port $svc.Port)) { throw "$($svc.Name) nao subiu na porta $($svc.Port)." }
      Write-Host "  $($svc.Name) :$($svc.Port) OK" -ForegroundColor Green
    } else {
      Write-Host "  $($svc.Name) :$($svc.Port) ja em uso - mantendo." -ForegroundColor DarkYellow
    }
  }

  if (-not (Test-Port 8083)) {
    Start-Logged "worker" "worker" ".\services\workers\workers.exe"
    if (-not (Wait-Port 8083)) { throw "Worker nao subiu na porta 8083." }
    Write-Host "  worker :8083 OK" -ForegroundColor Green
  } else {
    Write-Host "  worker :8083 ja em uso - mantendo." -ForegroundColor DarkYellow
  }
}

if (-not (Test-Path "apps/bff/node_modules")) {
  Write-Host "pnpm install (bff)..."
  pnpm -C apps/bff install
}

if (Test-Port 3001) {
  Write-Host "  BFF :3001 ja em uso." -ForegroundColor DarkYellow
  Write-Host "  Para hot reload do BFF, pare o processo na 3001 e rode de novo." -ForegroundColor DarkYellow
} else {
  Start-Logged "bff (watch)" "bff" "pnpm -C apps/bff start:dev"
  if (-not (Wait-Port 3001)) { throw "BFF nao subiu na porta 3001." }
  Write-Host "  bff :3001 OK (watch)" -ForegroundColor Green
}

if (-not (Test-Path "apps/web/node_modules")) {
  Write-Host "pnpm install (web)..."
  pnpm -C apps/web install
}

if (Test-Port 3000) {
  Write-Host ""
  Write-Host "  Web :3000 ja em uso (provavelmente 'next start' - SEM hot reload)." -ForegroundColor Red
  Write-Host "  Pare o processo e rode:" -ForegroundColor Red
  Write-Host "    pnpm -C apps/web dev" -ForegroundColor Cyan
} else {
  Start-Logged "web (dev / HMR)" "web" "pnpm -C apps/web dev"
  if (-not (Wait-Port 3000)) { throw "Web nao subiu na porta 3000." }
  Write-Host "  web :3000 OK (HMR - salve o CSS e veja ao vivo)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pronto." -ForegroundColor Green
Write-Host "  UI (hot reload) -> http://localhost:3000"
Write-Host "  BFF             -> http://localhost:3001"
Write-Host "  Gateway         -> http://localhost:8090"
Write-Host ""
Write-Host "Dica: edite apps/web/src/app/globals.css e a pagina recarrega sozinha."
Write-Host "Logs em .tmp/local-stack/*.log"
Write-Host ""
