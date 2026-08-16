import React, { useState, useEffect, useRef } from "react";
import { MusicAnalysis, DemoTrack } from "./types";
import { demoTracks } from "./data/demoTracks";
import AnalysisResult from "./components/AnalysisResult";
import MicListener from "./components/MicListener";
import SettingsModal from "./components/SettingsModal";
import AudioPlayerBar from "./components/AudioPlayerBar";
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
  AlertTriangle,
  Server,
  Globe
} from "lucide-react";
import {
  SupportedLanguage,
  TRANSLATIONS,
} from "./i18n/translations";

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

  // Settings & i18n States
  const [provider, setProvider] = useState<"gemini" | "ollama">(() => {
    return (localStorage.getItem("ai_provider") as any) || "gemini";
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || "";
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("gemini_model") || "gemini-3.6-flash";
  });
  const [ollamaUrl, setOllamaUrl] = useState<string>(() => {
    return localStorage.getItem("ollama_url") || "http://localhost:11434";
  });
  const [ollamaModel, setOllamaModel] = useState<string>(() => {
    return localStorage.getItem("ollama_model") || "qwen2-audio";
  });
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem("app_language") as any) || "en";
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state helpers
  const handleSaveProvider = (p: "gemini" | "ollama") => {
    setProvider(p);
    localStorage.setItem("ai_provider", p);
  };

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    if (newKey) localStorage.setItem("gemini_api_key", newKey);
    else localStorage.removeItem("gemini_api_key");
  };

  const handleSaveModel = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("gemini_model", model);
  };

  const handleSaveOllamaUrl = (url: string) => {
    setOllamaUrl(url);
    localStorage.setItem("ollama_url", url);
  };

  const handleSaveOllamaModel = (model: string) => {
    setOllamaModel(model);
    localStorage.setItem("ollama_model", model);
  };

  const handleSaveLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
  };

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
    if (files && files.length > 0) validateAndProcessFile(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) validateAndProcessFile(files[0]);
  };

  const validateAndProcessFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("audio/")) {
      setError("Please upload a valid audio file (MP3, WAV, M4A, OGG, etc.).");
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("File is too large. Please select an audio file under 15MB.");
      return;
    }
    setFile(selectedFile);
    setSelectedDemoId(null);
    setAnalysis(null);
    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleAnalyze = async () => {
    if (!file) return;

    if (provider === "gemini" && (!apiKey || apiKey.trim() === "")) {
      setError(t.noKeyWarning);
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const base64Data = await fileToBase64(file);

      const response = await fetch("/api/analyze-music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey.trim(),
          "x-gemini-model": selectedModel,
          "x-app-language": language,
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileData: base64Data,
          provider,
          selectedModel: provider === "gemini" ? selectedModel : ollamaModel,
          ollamaUrl,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setIsSettingsOpen(true);
        throw new Error(data.error || "Failed to analyze audio file.");
      }
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not analyze this audio. Check your settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicAudioCaptured = async (blob: Blob, base64Data: string, mimeType: string) => {
    if (provider === "gemini" && (!apiKey || apiKey.trim() === "")) {
      setError(t.noKeyWarning);
      setIsSettingsOpen(true);
      return;
    }

    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setFile(null);
    setSelectedDemoId(null);
    setRecordedTitle("Mic Recording");
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
          "x-app-language": language,
        },
        body: JSON.stringify({
          fileName: "recorded_mic_audio.webm",
          mimeType: mimeType || "audio/webm",
          fileData: base64Data,
          provider,
          selectedModel: provider === "gemini" ? selectedModel : ollamaModel,
          ollamaUrl,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setIsSettingsOpen(true);
        throw new Error(data.error || "Failed to analyze mic recording.");
      }
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not analyze recorded audio. Check settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemoTrack = (track: DemoTrack) => {
    setError(null);
    setFile(null);
    setAudioUrl(null);
    setRecordedTitle(null);
    setSelectedDemoId(track.id);
    setAnalysis(track.analysis);
  };

  const handleReset = () => {
    setFile(null);
    if (audioUrl && !selectedDemoId) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAnalysis(null);
    setSelectedDemoId(null);
    setRecordedTitle(null);
    setError(null);
  };

  const fileToBase64 = (fileObj: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileObj);
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to convert file to base64."));
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const isProviderConfigured = provider === "ollama" || Boolean(apiKey.trim());

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans selection:bg-[#88aaff] selection:text-black relative overflow-x-hidden">
      <div className="atmosphere"></div>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 md:py-10 flex flex-col items-center relative z-10">
        
        {/* Header */}
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
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`glass-card px-4 py-2.5 rounded-full text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm border ${
                isProviderConfigured
                  ? "border-white/10 text-white"
                  : "border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
              }`}
            >
              <Settings className="w-4 h-4 text-[#88aaff]" />
              <span className="hidden sm:inline">{t.settingsBtn}</span>
              {isProviderConfigured ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{provider === "ollama" ? "Ollama" : t.configured}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 text-[11px] font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3 animate-pulse" />
                  <span>{t.noKey}</span>
                </span>
              )}
            </button>

            {analysis && (
              <button
                onClick={handleReset}
                className="glass-card px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-white/10 transition-all text-white flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {t.newUploadBtn}
              </button>
            )}
          </div>
        </header>

        {/* Hero title */}
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[#88aaff] text-xs font-mono tracking-wider mb-4 select-none uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#88aaff]" />
            {t.heroBadge} • {provider === "ollama" ? `OLLAMA (${ollamaModel || "local"})` : selectedModel.replace(/-/g, " ")}
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-black tracking-tight text-white font-sans bg-clip-text mb-3"
          >
            {t.appTitle}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-white/60 text-sm md:text-base max-w-xl mx-auto font-medium"
          >
            {t.appDescription}
          </motion.p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 shadow-lg"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">{error}</div>
          </motion.div>
        )}

        {/* Main Content Area */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {analysis ? (
              <AnalysisResult
                key="results"
                analysis={analysis}
                songTitle={file?.name || recordedTitle || "Track"}
                audioUrl={audioUrl}
                language={language}
              />
            ) : (
              <motion.div key="input" className="w-full max-w-3xl mx-auto space-y-8">
                
                {/* Input Mode Selector */}
                <div className="flex justify-center mb-6">
                  <div className="glass-card p-1.5 rounded-full border border-white/10 inline-flex gap-1 shadow-inner">
                    <button
                      onClick={() => setInputMode("upload")}
                      className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        inputMode === "upload"
                          ? "bg-white text-black shadow-lg"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{t.uploadTab}</span>
                    </button>
                    <button
                      onClick={() => setInputMode("mic")}
                      className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        inputMode === "mic"
                          ? "bg-white text-black shadow-lg"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>{t.micTab}</span>
                    </button>
                  </div>
                </div>

                {/* File Upload Mode */}
                {inputMode === "upload" ? (
                  <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden text-center space-y-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                      className={`border-2 border-dashed rounded-2xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                        isDragging
                          ? "border-[#88aaff] bg-[#88aaff]/10"
                          : "border-white/15 hover:border-white/30 bg-white/[0.01]"
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#88aaff]">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">{t.dragDropText}</p>
                        <p className="text-xs text-white/40">{t.audioSupport}</p>
                      </div>
                    </div>

                    {file && audioUrl && (
                      <div className="space-y-4 text-left">
                        <AudioPlayerBar
                          audioUrl={audioUrl}
                          title={file.name}
                          subtitle={`{(file.size / (1024 * 1024)).toFixed(2)} MB • ${file.type || "audio"}`}
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleAnalyze}
                            disabled={isLoading}
                            className="px-6 py-3 rounded-xl bg-[#88aaff] hover:bg-[#99bbff] text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(136,170,255,0.3)] cursor-pointer flex items-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>{isLoading ? "Analyzing..." : t.analyzeBtn}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Microphone Mode */
                  <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl text-center space-y-6">
                    <MicListener onAudioCaptured={handleMicAudioCaptured} language={language} />
                    {audioUrl && (
                      <div className="pt-4 border-t border-white/10 text-left">
                        <p className="text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                          Gravado via Microfone:
                        </p>
                        <AudioPlayerBar
                          audioUrl={audioUrl}
                          title={recordedTitle || "Gravação do Microfone"}
                          subtitle="Áudio Captado"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Pre-analyzed Demo Tracks */}
                <div className="space-y-6 pt-6">
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">{t.demoTracksTitle}</h3>
                    <p className="text-xs text-white/50 mt-1 font-medium">{t.demoTracksSub}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {demoTracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => selectDemoTrack(track)}
                        className="glass-card p-6 rounded-3xl border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer group flex flex-col justify-between min-h-[190px] shadow-lg"
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
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#88aaff] group-hover:text-white mt-5 transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{t.viewAnalysis}</span>
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

      <footer className="w-full bg-black/40 border-t border-white/10 py-8 text-center text-xs text-white/40 mt-20 relative z-10">
        <p className="max-w-xl mx-auto px-6 leading-relaxed">
          © 2026 SUNO.AI ANALYZER. Multi-language intelligent audio transcription & analysis.
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        provider={provider}
        onSaveProvider={handleSaveProvider}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        selectedModel={selectedModel}
        onSaveModel={handleSaveModel}
        ollamaUrl={ollamaUrl}
        onSaveOllamaUrl={handleSaveOllamaUrl}
        ollamaModel={ollamaModel}
        onSaveOllamaModel={handleSaveOllamaModel}
        language={language}
        onSaveLanguage={handleSaveLanguage}
      />
    </div>
  );
}
