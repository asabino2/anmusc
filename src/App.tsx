import React, { useState, useEffect, useRef } from "react";
import { MusicAnalysis, DemoTrack } from "./types";
import { demoTracks } from "./data/demoTracks";
import AnalysisResult from "./components/AnalysisResult";
import MicListener from "./components/MicListener";
import SettingsModal from "./components/SettingsModal";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Music,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  Disc,
  Play,
  Volume2,
  Trash2,
  Mic,
  Radio,
  Settings,
  Key,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

const LOADING_MESSAGES = [
  "Enviando o arquivo de áudio para análise...",
  "Analisando as frequências e o ritmo da música...",
  "Processando a estrutura instrumental...",
  "Transcrevendo a voz e gerando as letras...",
  "Formatando no padrão estrutural do Suno.ai [Verse/Chorus]...",
  "Estudando o andamento para calcular o BPM exato...",
  "Identificando perfil dos cantores, idade estimada e nacionalidade...",
  "Extraindo estilos, gêneros e tags descritivas...",
  "Polindo a análise geral da faixa..."
];

export default function App() {
  const [inputMode, setInputMode] = useState<"upload" | "mic">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedTitle, setRecordedTitle] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MusicAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Settings, API Key and Gemini Model states
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || "";
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("gemini_model") || "gemini-3.6-flash";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync server key status if local key is empty
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!apiKey && data.hasEnvKey) {
          // Keep local state aligned if server has env key
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    if (newKey) {
      localStorage.setItem("gemini_api_key", newKey);
    } else {
      localStorage.removeItem("gemini_api_key");
    }
  };

  const handleSaveModel = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("gemini_model", model);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages while analyzing
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3500);
    } else {
      setLoadingMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (audioUrl && !selectedDemoId) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, selectedDemoId]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const validateAndProcessFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("audio/")) {
      setError("Por favor, envie um arquivo de áudio válido (MP3, WAV, M4A, OGG, etc.).");
      return;
    }

    // Limit to 15MB for practical browser-to-server handling
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("O arquivo é muito grande. Escolha um arquivo de áudio de até 15MB.");
      return;
    }

    setFile(selectedFile);
    setSelectedDemoId(null);
    setAnalysis(null);

    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!file) return;

    if (!apiKey || apiKey.trim() === "") {
      setError("Chave API do Google Gemini não configurada! Clique em Configurações para adicionar sua chave.");
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Convert file to base64
      const base64Data = await fileToBase64(file);

      const response = await fetch("/api/analyze-music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey.trim(),
          "x-gemini-model": selectedModel,
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileData: base64Data,
          selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setIsSettingsOpen(true);
        }
        throw new Error(data.error || "Erro desconhecido ao processar o áudio.");
      }

      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          "Não foi possível analisar este áudio. Verifique sua chave de API do Gemini nas configurações ou tente outro arquivo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicAudioCaptured = async (blob: Blob, base64Data: string, mimeType: string) => {
    if (!apiKey || apiKey.trim() === "") {
      setError("Chave API do Google Gemini não configurada! Clique em Configurações para adicionar sua chave.");
      setIsSettingsOpen(true);
      return;
    }

    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setFile(null);
    setSelectedDemoId(null);
    setRecordedTitle("Gravação Ambiente (Microfone)");
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze-music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey.trim(),
          "x-gemini-model": selectedModel,
        },
        body: JSON.stringify({
          fileName: "gravacao-microfone-shazam.webm",
          mimeType: mimeType || "audio/webm",
          fileData: base64Data,
          selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setIsSettingsOpen(true);
        }
        throw new Error(data.error || "Erro ao processar o áudio gravado.");
      }

      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          "Não foi possível analisar o áudio gravado pelo microfone. Verifique sua chave de API do Gemini nas configurações ou tente gravar novamente mais próximo da fonte."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemoTrack = (track: DemoTrack) => {
    setError(null);
    setFile(null);
    setAudioUrl(null); // No actual audio for mock demo, or could use public URLs
    setRecordedTitle(null);
    setSelectedDemoId(track.id);
    setAnalysis(track.analysis);
  };

  const handleReset = () => {
    setFile(null);
    if (audioUrl && !selectedDemoId) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAnalysis(null);
    setSelectedDemoId(null);
    setRecordedTitle(null);
    setError(null);
  };

  // Helper to read file as base64
  const fileToBase64 = (fileObj: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileObj);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Falha ao converter arquivo para base64."));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans selection:bg-[#88aaff] selection:text-black relative overflow-x-hidden">
      {/* Immersive Atmosphere Ambient Elements */}
      <div className="atmosphere"></div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 md:py-10 flex flex-col items-center relative z-10">
        
        {/* Immersive Header matching Design */}
        <header className="w-full flex justify-between items-center mb-8 md:mb-12 border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <div className="w-4 h-4 bg-black rounded-sm rotate-45"></div>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tighter italic text-white uppercase">
              SUNO.AI ANALYZER
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`glass-card px-4 py-2.5 rounded-full text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm border ${
                apiKey.trim()
                  ? "border-white/10 text-white"
                  : "border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
              }`}
              title="Configurações da API Key do Gemini"
            >
              <Settings className="w-4 h-4 text-[#88aaff]" />
              <span className="hidden sm:inline">Settings</span>
              {apiKey.trim() ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Configurada</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 text-[11px] font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3 animate-pulse" />
                  <span>Sem Chave</span>
                </span>
              )}
            </button>

            {analysis && (
              <button
                onClick={handleReset}
                className="glass-card px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-white/10 transition-all text-white flex items-center gap-2 cursor-pointer shadow-sm"
              >
                + Upload Novo Track
              </button>
            )}
          </div>
        </header>

        {/* App Title & Subtitle */}
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[#88aaff] text-xs font-mono tracking-wider mb-4 select-none uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#88aaff]" />
            LIVE INTEL • {selectedModel.replace(/-/g, " ")}
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-black tracking-tight text-white font-sans bg-clip-text mb-3"
          >
            Analisador de Letra & Ritmo
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-white/60 text-sm md:text-base max-w-xl mx-auto font-medium"
          >
            Faça upload de uma música para transcrever a letra no formato estruturado do <strong className="text-white">Suno.ai</strong>, detectar o BPM, identificar cantores, gêneros, estilos e tags.
          </motion.p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl mb-8 p-4.5 rounded-2xl bg-red-950/40 border border-red-800/30 text-red-200 text-sm flex items-start gap-3 shadow-2xl backdrop-blur-md"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="font-bold text-red-300">Erro de Processamento</h5>
              <p className="mt-1 text-red-200/85">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 text-xs underline font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </motion.div>
        )}

        {/* Dynamic Content Wrapper */}
        <div className="w-full flex-1 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {/* Loading Screen */}
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md glass-card rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl my-12"
              >
                <div className="relative mb-6">
                  {/* Rotating disc */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-0.5 shadow-[0_0_30px_rgba(136,170,255,0.25)]"
                  >
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center relative">
                      <Disc className="w-12 h-12 text-[#88aaff]" />
                      <div className="absolute w-3 h-3 bg-black rounded-full border border-[#88aaff]/30"></div>
                    </div>
                  </motion.div>
                  {/* Radar ripple effect */}
                  <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping pointer-events-none"></div>
                </div>

                <h4 className="text-lg font-bold text-white tracking-tight">Analisando faixa...</h4>
                
                <div className="h-10 flex items-center justify-center mt-3">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMsgIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs md:text-sm text-[#88aaff] font-semibold"
                    >
                      {LOADING_MESSAGES[loadingMsgIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-6">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-[#88aaff] w-1/2 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-4">Isso leva de 15 a 30 segundos</p>
              </motion.div>
            ) : analysis ? (
              /* Analysis Output Screen */
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col gap-6"
              >
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-4.5 rounded-3xl w-full">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleReset}
                      className="p-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all border border-white/10 cursor-pointer"
                      title="Analisar outra música"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-sm uppercase tracking-widest font-semibold text-white/50">
                        {selectedDemoId
                          ? "Música Demonstrativa"
                          : recordedTitle
                          ? "Reconhecimento Via Microfone (Shazam)"
                          : "Música Analisada"}
                      </h2>
                      <p className="text-base font-bold text-white mt-1 max-w-[250px] md:max-w-md truncate">
                        {selectedDemoId
                          ? demoTracks.find((t) => t.id === selectedDemoId)?.title + " - " + demoTracks.find((t) => t.id === selectedDemoId)?.artist
                          : recordedTitle || file?.name || "Áudio Capturado"}
                      </p>
                    </div>
                  </div>

                  {/* Audio Preview if uploaded or recorded */}
                  {audioUrl && (
                    <div className="w-full sm:w-auto flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/10 shrink-0">
                      <Volume2 className="w-4 h-4 text-[#88aaff] shrink-0" />
                      <audio src={audioUrl} controls className="h-8 max-w-full sm:w-60 md:w-72 accent-[#88aaff]" />
                    </div>
                  )}
                </div>

                {/* Grid Results Component */}
                <AnalysisResult
                  analysis={analysis}
                  songTitle={
                    selectedDemoId
                      ? demoTracks.find((t) => t.id === selectedDemoId)?.title
                      : file
                      ? file.name.replace(/\.[^/.]+$/, "")
                      : analysis.songName || "Áudio Ambiente"
                  }
                  songArtist={selectedDemoId ? demoTracks.find((t) => t.id === selectedDemoId)?.artist : "Gravação / Áudio"}
                />

                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-full text-sm transition-all shadow-lg hover:shadow-indigo-500/15 border border-indigo-400/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Analisar Outra Música
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Landing Upload Zone / Demo Selection Screen */
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-4xl flex flex-col gap-10"
              >
                {/* Input Mode Selector Tabs (Upload vs Shazam Microphone) */}
                <div className="w-full max-w-2xl mx-auto">
                  <div className="flex items-center justify-center p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 shadow-lg backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode("upload");
                        setError(null);
                      }}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        inputMode === "upload"
                          ? "bg-white/10 text-white border border-white/15 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                          : "text-white/50 hover:text-white/80 border border-transparent"
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Enviar Arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode("mic");
                        setError(null);
                      }}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        inputMode === "mic"
                          ? "bg-gradient-to-r from-indigo-600/30 to-[#88aaff]/30 text-[#88aaff] border border-[#88aaff]/30 shadow-[0_0_20px_rgba(136,170,255,0.2)]"
                          : "text-white/50 hover:text-white/80 border border-transparent"
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      Ouvir ao Vivo (Modo Shazam)
                    </button>
                  </div>

                  {/* Mode 1: File Upload */}
                  {inputMode === "upload" ? (
                    <div>
                      {!file ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={triggerFileSelect}
                          className={`relative flex flex-col items-center justify-center p-12 md:p-16 rounded-3xl border-2 border-dashed transition-all cursor-pointer select-none group text-center ${
                            isDragging
                              ? "border-[#88aaff] bg-[#88aaff]/5 shadow-[0_0_30px_rgba(136,170,255,0.15)]"
                              : "border-white/10 hover:border-[#88aaff]/40 bg-white/[0.02] hover:bg-white/[0.04] shadow-xl"
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="audio/*"
                            className="hidden"
                          />
                          
                          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:border-[#88aaff]/30 transition-all text-[#88aaff] group-hover:text-white group-hover:shadow-[0_0_20px_rgba(136,170,255,0.2)]">
                            <Upload className="w-7 h-7" />
                          </div>

                          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                            Arraste seu arquivo de áudio aqui
                          </h3>
                          <p className="text-xs md:text-sm text-white/50 mt-2 max-w-sm font-medium leading-relaxed">
                            Ou clique para procurar no seu dispositivo. Suporta arquivos de áudio comuns de até 15MB.
                          </p>
                          
                          <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase mt-8 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
                            MP3, WAV, M4A, OGG, AAC
                          </span>
                        </div>
                      ) : (
                        /* File Selected, Ready to Analyze */
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 md:p-8 rounded-3xl glass-card border border-white/15 flex flex-col md:flex-row items-center gap-6 shadow-2xl justify-between"
                        >
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 text-[#88aaff] flex items-center justify-center shrink-0">
                              <Music className="w-7 h-7" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base font-bold text-white truncate max-w-[240px] sm:max-w-sm">
                                {file.name}
                              </h4>
                              <p className="text-xs text-white/50 mt-1">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB • Pronto para analisar
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                            <button
                              onClick={handleReset}
                              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-red-400 border border-white/10 transition-all cursor-pointer"
                              title="Remover arquivo"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleAnalyze}
                              className="flex-1 md:flex-initial px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-full text-sm transition-all shadow-lg hover:shadow-indigo-500/15 flex items-center justify-center gap-2 border border-indigo-400/20 cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                              Analisar Agora
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Audio player preview below upload box */}
                      {file && audioUrl && !isLoading && !analysis && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-4 rounded-2xl bg-black/30 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3"
                        >
                          <span className="text-xs text-white/50 font-sans flex items-center gap-2 font-medium">
                            <Volume2 className="w-4 h-4 text-[#88aaff] shrink-0" />
                            Prévia do Áudio:
                          </span>
                          <audio src={audioUrl} controls className="h-8 max-w-full sm:w-80 md:w-96 accent-[#88aaff]" />
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    /* Mode 2: Live Shazam Microphone Capture */
                    <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                      <MicListener
                        onAudioCaptured={handleMicAudioCaptured}
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>

                {/* Divider Line */}
                <div className="relative flex items-center justify-center my-4 max-w-2xl mx-auto w-full">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <span className="relative px-6 text-[10px] font-mono text-white/40 uppercase tracking-widest bg-[#050505]">
                    Ou experimente amostras predefinidas
                  </span>
                </div>

                {/* Demo Tracks Grid Selection */}
                <div className="space-y-6">
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">Demonstrações Predefinidas</h3>
                    <p className="text-xs text-white/50 mt-1 font-medium">Explore análises estruturadas instantaneamente sem fazer uploads</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {demoTracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => selectDemoTrack(track)}
                        className="glass-card p-6 rounded-3xl border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer group flex flex-col justify-between min-h-[190px] shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-[#88aaff]/10 border border-[#88aaff]/25 text-[#88aaff] font-bold">
                              {track.analysis.bpm} BPM
                            </span>
                            <span className="text-[10px] font-mono text-white/40">{track.duration}</span>
                          </div>
                          
                          <h4 className="font-bold text-white group-hover:text-[#88aaff] transition-colors text-base tracking-tight">
                            {track.title}
                          </h4>
                          <p className="text-xs text-white/50 mt-0.5 font-semibold">{track.artist}</p>
                          <p className="text-xs text-white/40 mt-3 line-clamp-2 leading-relaxed">
                            {track.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#88aaff] group-hover:text-white mt-5 transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Ver Análise</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="w-full bg-black/40 border-t border-white/10 py-8 text-center text-xs text-white/40 mt-20 relative z-10">
        <p className="max-w-xl mx-auto px-6 leading-relaxed">
          © 2026 SUNO.AI ANALYZER. Desenvolvido para transcrição e análise de áudio inteligente de alta precisão.
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        selectedModel={selectedModel}
        onSaveModel={handleSaveModel}
      />
    </div>
  );
}
