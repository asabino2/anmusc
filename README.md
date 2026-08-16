# Suno.ai Music Lyric & BPM Analyzer

Aplicativo de análise de áudio inteligente powered by Google Gemini. Transcreve letras no padrão estrutural do **Suno.ai** (`[Verse]`, `[Chorus]`, etc.), calcula o BPM exato, identifica cantores (idade e nacionalidade estimada), gêneros, estilos, tags e oferece sugestões de músicas similares.

---

## 🚀 Como Instalar e Executar

### Windows
Você pode usar o Prompt de Comando (cmd) ou o PowerShell:

- **Instalação:**
  - Clique duas vezes em `install.bat` **OU** execute no PowerShell: `.\install.ps1`
- **Execução:**
  - Clique duas vezes em `start.bat` **OU** execute no PowerShell: `.\start.ps1`

### Linux / macOS
No terminal, execute os scripts Bash:

- **Instalação:**
  ```bash
  chmod +x install.sh start.sh
  ./install.sh
  ```
- **Execução:**
  ```bash
  ./start.sh
  ```

---

## 🔑 Configuração da Chave API do Google Gemini

O aplicativo **requer uma chave API do Google Gemini** para funcionar (não há chave embutida ou hardcoded).

1. Abra o aplicativo no navegador em `http://localhost:3000`.
2. Clique no botão **Settings** (com o ícone de engrenagem) no canto superior direito do cabeçalho.
3. Cole sua Chave API do Gemini (obtenha gratuitamente no [Google AI Studio](https://aistudio.google.com/app/apikey)).
4. Clique em **Testar Chave** para verificar se está funcionando e depois em **Salvar Chave**.
5. A chave será salva no seu navegador (`localStorage`) e no servidor local, habilitando todas as funções de análise.
