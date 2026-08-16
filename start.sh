#!/usr/bin/env bash

# Script de Execução Linux / macOS - Suno.ai Music Lyric & BPM Analyzer

echo -e "\033[1;36m=========================================================\033[0m"
echo -e "\033[1;36m  Iniciando - Suno.ai Music Lyric & BPM Analyzer\033[0m"
echo -e "\033[1;36m=========================================================\033[0m"
echo ""

if [ ! -d "node_modules" ]; then
    echo -e "\033[1;33m[AVISO] Pasta node_modules não encontrada! Executando instalador primeiro...\033[0m"
    ./install.sh
    if [ $? -ne 0 ]; then
        exit 1
    fi
fi

echo -e "\033[1;32mIniciando o servidor em modo de desenvolvimento...\033[0m"
echo -e "\033[1;36mAcesse no seu navegador: http://localhost:3000\033[0m"
echo ""

npm run dev
