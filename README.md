# 🎵 Suno.ai Music Lyric, BPM & Instrument Analyzer

An intelligent, state-of-the-art music analysis web application powered by **Google Gemini** (Cloud), **OpenRouter** (Cloud Multi-model), and **Ollama** (Local Server).

Transcribes audio into structured **Suno.ai** section tags (`[Verse]`, `[Chorus]`, `[Guitar Solo]`, `[Bridge]`, etc.), detects precise BPM, identifies real songs Shazam-style (with official HD album cover art & verified streaming links), displays vocalist profiles with photos, breaks down musical instruments with percentage shares, and renders a built-in audio player.

---

## ✨ Key Features

- 🎧 **Audio Player Bar**: Built-in glassmorphism audio player for MP3 uploads, live microphone captures, and analysis result preview.
- 🎯 **Shazam-Style Commercial Song Recognition**: Identifies real commercial tracks and retrieves official high-resolution album cover art (600x600 HD), album title, release year, and verified direct listening links (**YouTube Music**, **Spotify**, **Apple Music**).
- 🎵 **Verified Streaming Links**: Real-time verification for recognized tracks and similar songs with direct links to **YouTube Music**, **Spotify**, and **Apple Music / iTunes**.
- 👤 **Singer & Vocalist Profiles with Photos**: Displays vocalists' real names, gender, estimated age, nationality, and avatar photos.
- 🎸 **Detected Musical Instruments with Percentages**: Visual progress bars displaying the arrangement breakdown and percentage share of each instrument detected in the audio mix.
- 🎤 **Live Microphone Recording**: Capture audio live from desktop or mobile devices (iOS Safari & Android Chrome compatible).
- 🌐 **10-Language i18n System**: Full interface & AI analysis support in 10 languages.
- 🤖 **Multi AI Providers (Gemini, OpenRouter & Ollama)**: Choose between Google Gemini Cloud (`Gemini 3.6 Flash`, `Gemini 3.7 Flash`), OpenRouter multi-models, or a local Ollama server (`http://localhost:11434`), strictly filtered to display **only audio-capable models**.
- 🐳 **Docker Multi-Stage Alpine Build**: Clones repository directly from GitHub `https://github.com/asabino2/anmusc.git`.
- 💻 **Cross-Platform Scripts**: Windows (`.bat` / `.ps1`) and Linux/macOS (`.sh`) automated installation & startup scripts.

---

## 🌐 Supported Languages (i18n)

Both the web interface and the AI analysis output support 10 languages:

- 🇺🇸 **English** (`en`)
- 🇧🇷 **Portuguese** (`pt`)
- 🇪🇸 **Spanish** (`es`)
- 🇮🇹 **Italian** (`it`)
- 🇷🇺 **Russian** (`ru`)
- 🇨🇳 **Chinese** (`zh`)
- 🇹🇷 **Turkish** (`tr`)
- 🇵🇱 **Polish** (`pl`)
- 🇩🇪 **German** (`de`)
- 🇫🇷 **French** (`fr`)

Change the language anytime inside the **Settings** modal.

---

## 🐳 Docker Deployment (Recommended)

This project features a multi-stage Docker build based on **Alpine Linux** (`node:22-alpine`) that clones the latest repository code from `https://github.com/asabino2/anmusc.git`.

### Using Docker Compose:
```bash
docker compose up -d --build
```
Access in your browser: `http://localhost:3000`

### Using Docker CLI:
```bash
# 1. Build Docker image
docker build -t suno-analyzer:latest .

# 2. Run container
docker run -d -p 3000:3000 --name suno_analyzer_app suno-analyzer:latest
```

---

## 🚀 Local Installation & Execution (Without Docker)

### Windows
- **Installation**: Double-click `install.bat` **OR** run in PowerShell: `.\install.ps1`
- **Execution**: Double-click `start.bat` **OR** run in PowerShell: `.\start.ps1`

### Linux / macOS
```bash
chmod +x install.sh start.sh

# 1. Install dependencies
./install.sh

# 2. Start application
./start.sh
```

---

## 📱 Smartphone & Mobile Access (Microphone Permissions)

Mobile browsers (iOS Safari & Android Chrome) require a **Secure Context (HTTPS or localhost)** to allow microphone access.

### Accessing via local network (LAN) on mobile:
To use the live microphone on a smartphone connected to your local Wi-Fi:

1. **Option A: Free HTTPS Tunnel (Recommended)**:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
   Open the generated `https://xxxx.trycloudflare.com` link on your phone. Microphone permissions will work seamlessly!

2. **Option B: Chrome Flags (Android)**:
   - On Android Chrome, navigate to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - Add your PC's IP address (e.g. `http://192.168.1.50:3000`), enable the flag, and restart Chrome.

---

## 🔑 AI Provider & Settings Setup

1. Open `http://localhost:3000` in your browser.
2. Click the **Settings** button (gear icon) in the header.
3. Select your AI Provider:
   - **Google Gemini**: Input your Gemini API Key (free from [Google AI Studio](https://aistudio.google.com/app/apikey)) and pick a model (`Gemini 3.6 Flash` or `Gemini 3.7 Flash`).
   - **OpenRouter**: Input your OpenRouter API Key (`sk-or-v1-...` from [OpenRouter Keys](https://openrouter.ai/keys)) and select from dynamically filtered audio-capable models (`Gemini 2.5 Flash`, `GPT-4o Audio`, `Voxtral`, etc.).
   - **Ollama**: Input your Ollama Server URL (`http://localhost:11434`), click **Check Ollama**, and pick an installed audio-capable model (`qwen2-audio`, `whisper`, etc.).
4. Select your preferred **Language**.
5. Click **Save**.

---

## 📝 Changelog

### Recent Updates

- ⚡ **OpenRouter AI Provider Support**: Full integration with OpenRouter API (`https://openrouter.ai`) for cloud-based multi-model audio analysis.
- 🔊 **Strict Audio Model Filtering**: Automatically filters model listings for OpenRouter and Ollama to display **only models supporting audio input**.
- 🎶 **Verified Direct Streaming Links**: Real-time lookup for recognized tracks and similar songs with direct links to **YouTube Music**, **Spotify**, and **Apple Music / iTunes** (only displayed when verified to exist).
- 🐛 **Ollama Model Parameter Fix**: Resolved a bug where the model parameter selected by the user for Ollama was being overridden by the default Gemini model.
- 🔄 **Unified Provider Pipeline**: Standardized metadata enrichment, singer avatar generation, and streaming links verification across Gemini, OpenRouter, and Ollama providers.

---

## 📄 License

MIT License. Open source and free for personal and commercial use.
