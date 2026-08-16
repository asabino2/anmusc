@echo off
setlocal enabledelayedexpansion
title Instalação - Suno.ai Music Lyric ^& BPM Analyzer

echo =========================================================
echo   Instalador - Suno.ai Music Lyric ^& BPM Analyzer
echo =========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao foi encontrado no sistema!
    echo Por favor, instale o Node.js v18 ou superior acessando: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] Node.js detectado com sucesso:
node -v
echo.

echo [2/3] Instalando dependencias do projeto (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias com npm install.
    pause
    exit /b 1
)

echo [3/3] Verificando arquivo de configuracao (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Archivo .env criado a partir de .env.example.
    ) else (
        echo GEMINI_API_KEY="" > .env
        echo Archivo .env inicializado.
    )
) else (
    echo Archivo .env ja existente.
)

echo.
echo =========================================================
echo   Instalacao concluida com sucesso!
echo   Para iniciar a aplicacao, execute o script 'start.bat'
echo =========================================================
echo.
pause
