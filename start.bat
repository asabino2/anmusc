@echo off
setlocal enabledelayedexpansion
title Execucao - Suno.ai Music Lyric ^& BPM Analyzer

echo =========================================================
echo   Iniciando - Suno.ai Music Lyric ^& BPM Analyzer
echo =========================================================
echo.

if not exist "node_modules" (
    echo [AVISO] Pasta node_modules nao encontrada! Executando instalador primeiro...
    call install.bat
    if %errorlevel% neq 0 exit /b %errorlevel%
)

echo Iniciando o servidor em modo de desenvolvimento...
echo Acesse no seu navegador: http://localhost:3000
echo.

node node_modules/tsx/dist/cli.mjs server.ts

pause
