# Script de Instalacao PowerShell - Suno.ai Music Lyric & BPM Analyzer

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Instalador - Suno.ai Music Lyric & BPM Analyzer" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "[ERRO] Node.js nao foi encontrado no sistema!" -ForegroundColor Red
    Write-Host "Por favor, instale o Node.js v18 ou superior acessando: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host -Prompt "Pressione Enter para sair..."
    exit 1
}

$nodeVer = node -v
Write-Host "[1/3] Node.js detectado com sucesso: $nodeVer" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Instalando dependencias do projeto (npm install)..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao instalar dependencias com npm install." -ForegroundColor Red
    Read-Host -Prompt "Pressione Enter para sair..."
    exit 1
}

Write-Host "[3/3] Verificando arquivo de configuracao (.env)..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Arquivo .env criado a partir de .env.example." -ForegroundColor Green
    } else {
        Set-Content -Path ".env" -Value 'GEMINI_API_KEY=""'
        Write-Host "Arquivo .env inicializado." -ForegroundColor Green
    }
} else {
    Write-Host "Arquivo .env ja existente." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Instalacao concluida com sucesso!" -ForegroundColor Green
Write-Host "  Para iniciar a aplicacao, execute o script 'start.ps1' ou 'start.bat'" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
