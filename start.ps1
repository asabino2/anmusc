# Script de Execucao PowerShell - Suno.ai Music Lyric & BPM Analyzer

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando - Suno.ai Music Lyric & BPM Analyzer" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "node_modules")) {
    Write-Host "[AVISO] Pasta node_modules nao encontrada! Executando instalador primeiro..." -ForegroundColor Yellow
    & .\install.ps1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Iniciando o servidor em modo de desenvolvimento..." -ForegroundColor Green
Write-Host "Acesse no seu navegador: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

node node_modules/tsx/dist/cli.mjs server.ts
