#!/usr/bin/env bash

# Script de Instalação Linux / macOS - Suno.ai Music Lyric & BPM Analyzer

echo -e "\033[1;36m=========================================================\033[0m"
echo -e "\033[1;36m  Instalador - Suno.ai Music Lyric & BPM Analyzer\033[0m"
echo -e "\033[1;36m=========================================================\033[0m"
echo ""

if ! command -v node &> /dev/null; then
    echo -e "\033[1;31m[ERRO] Node.js não foi encontrado no seu sistema!\033[0m"
    echo -e "\033[1;33mPor favor, instale o Node.js v18 ou superior acessando: https://nodejs.org/\033[0m"
    exit 1
fi

echo -e "\033[1;32m[1/3] Node.js detectado com sucesso: $(node -v)\033[0m"
echo ""

echo -e "\033[1;33m[2/3] Instalando dependências do projeto (npm install)...\033[0m"
npm install

if [ $? -ne 0 ]; then
    echo -e "\033[1;31m[ERRO] Falha ao instalar dependências com npm install.\033[0m"
    exit 1
fi

echo -e "\033[1;33m[3/3] Verificando arquivo de configuração (.env)...\033[0m"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "\033[1;32mArquivo .env criado a partir de .env.example.\033[0m"
    else
        echo 'GEMINI_API_KEY=""' > .env
        echo -e "\033[1;32mArquivo .env inicializado.\033[0m"
    fi
else
    echo "Arquivo .env já existente."
fi

# Garantir permissão de execução nos scripts
chmod +x install.sh start.sh 2>/dev/null || true

echo ""
echo -e "\033[1;36m=========================================================\033[0m"
echo -e "\033[1;32m  Instalação concluída com sucesso!\033[0m"
echo -e "\033[1;32m  Para iniciar a aplicação, execute o script './start.sh'\033[0m"
echo -e "\033[1;36m=========================================================\033[0m"
echo ""
