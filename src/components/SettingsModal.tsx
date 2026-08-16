import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Cpu,
  Globe,
  Server,
  Sparkles
} from "lucide-react";
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
} from "../i18n/translations";

export const MODEL_OPTIONS = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tag: "Recomendado",
    description: "Equilíbrio perfeito de velocidade e alta fidelidade na transcrição e BPM.",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    tag: "Próxima Geração",
    description: "Máxima precisão analítica em partes instrumentais e nuances vocais.",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    tag: "Modo Rápido",
    description: "Modelo otimizado para respostas ultra rápidas.",
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: "gemini" | "ollama";
  onSaveProvider: (provider: "gemini" | "ollama") => void;
  apiKey: string;
  onSaveApiKey: (newKey: string) => void;
  selectedModel: string;
  onSaveModel: (model: string) => void;
  ollamaUrl: string;
  onSaveOllamaUrl: (url: string) => void;
  ollamaModel: string;
  onSaveOllamaModel: (model: string) => void;
  language: SupportedLanguage;
  onSaveLanguage: (lang: SupportedLanguage) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  provider,
  onSaveProvider,
  apiKey,
  onSaveApiKey,
  selectedModel,
  onSaveModel,
  ollamaUrl,
  onSaveOllamaUrl,
  ollamaModel,
  onSaveOllamaModel,
  language,
  onSaveLanguage,
}: SettingsModalProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [inputProvider, setInputProvider] = useState<"gemini" | "ollama">(provider || "gemini");
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputModel, setInputModel] = useState(selectedModel || "gemini-3.6-flash");
  const [inputOllamaUrl, setInputOllamaUrl] = useState(ollamaUrl || "http://localhost:11434");
  const [inputOllamaModel, setInputOllamaModel] = useState(ollamaModel || "");
  const [inputLanguage, setInputLanguage] = useState<SupportedLanguage>(language || "en");
  
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string }>>([]);
  const [ollamaCheckStatus, setOllamaCheckStatus] = useState<string | null>(null);

  const [verifyStatus, setVerifyStatus] = useState<{
    tested: boolean;
    valid: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setInputProvider(provider || "gemini");
    setInputKey(apiKey);
    setInputModel(selectedModel || "gemini-3.6-flash");
    setInputOllamaUrl(ollamaUrl || "http://localhost:11434");
    setInputOllamaModel(ollamaModel || "");
    setInputLanguage(language || "en");
    setVerifyStatus(null);
    setOllamaCheckStatus(null);
  }, [provider, apiKey, selectedModel, ollamaUrl, ollamaModel, language, isOpen]);

  if (!isOpen) return null;

  const handleCheckOllama = async () => {
    setIsCheckingOllama(true);
    setOllamaCheckStatus(null);

    try {
      const response = await fetch("/api/ollama/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ollamaUrl: inputOllamaUrl.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setOllamaModels(data.models || []);
        if (data.models && data.models.length > 0 && !inputOllamaModel) {
          setInputOllamaModel(data.models[0].name);
        }
        setOllamaCheckStatus(data.message || `Conectado ao Ollama! ${data.models.length} modelos encontrados.`);
      } else {
        setOllamaModels([]);
        setOllamaCheckStatus(data.error || "Falha ao conectar com o Ollama.");
      }
    } catch (err: any) {
      setOllamaModels([]);
      setOllamaCheckStatus("Erro ao conectar no servidor Ollama local.");
    } finally {
      setIsCheckingOllama(false);
    }
  };

  const handleTestKey = async () => {
    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const response = await fetch("/api/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: inputProvider,
          apiKey: inputKey.trim(),
          model: inputProvider === "gemini" ? inputModel : inputOllamaModel,
          ollamaUrl: inputOllamaUrl.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setVerifyStatus({
          tested: true,
          valid: true,
          message: data.message || "Provedor e modelo validados com sucesso!",
        });
      } else {
        setVerifyStatus({
          tested: true,
          valid: false,
          message: data.error || "Falha na validação do provedor.",
        });
      }
    } catch (err: any) {
      setVerifyStatus({
        tested: true,
        valid: false,
        message: "Não foi possível comunicar com o servidor.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    const trimmedKey = inputKey.trim();
    onSaveProvider(inputProvider);
    onSaveApiKey(trimmedKey);
    onSaveModel(inputModel);
    onSaveOllamaUrl(inputOllamaUrl.trim());
    onSaveOllamaModel(inputOllamaModel);
    onSaveLanguage(inputLanguage);

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: inputProvider,
          apiKey: trimmedKey,
          model: inputModel,
          ollamaUrl: inputOllamaUrl.trim(),
          ollamaModel: inputOllamaModel,
          language: inputLanguage,
        }),
      });
    } catch (e) {
      console.warn("Could not persist to server:", e);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleRemove = async () => {
    setInputKey("");
    onSaveApiKey("");
    setVerifyStatus(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 text-white bg-[#0e0e12] max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[#88aaff]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white font-sans">
                {t.settingsTitle}
              </h3>
              <p className="text-xs text-white/60">{t.settingsSub}</p>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#88aaff]" />
              {t.aiProviderLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInputProvider("gemini")}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  inputProvider === "gemini"
                    ? "bg-indigo-500/20 border-[#88aaff] text-white shadow-[0_0_15px_rgba(136,170,255,0.2)]"
                    : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                <Sparkles className="w-5 h-5 text-[#88aaff]" />
                <div>
                  <div className="text-xs font-bold">{t.geminiProvider}</div>
                  <div className="text-[10px] text-white/40">API Key Google</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInputProvider("ollama")}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  inputProvider === "ollama"
                    ? "bg-indigo-500/20 border-[#88aaff] text-white shadow-[0_0_15px_rgba(136,170,255,0.2)]"
                    : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                <Server className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold">{t.ollamaProvider}</div>
                  <div className="text-[10px] text-white/40">Localhost / Server</div>
                </div>
              </button>
            </div>
          </div>

          {/* Gemini Settings View */}
          {inputProvider === "gemini" && (
            <>
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/70 leading-relaxed space-y-2">
                <p>
                  Requer uma <strong className="text-white">Chave API do Google Gemini</strong>.
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#88aaff] hover:underline font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.getFreeKeyLink}
                </a>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
                  {t.geminiKeyLabel}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value);
                      setVerifyStatus(null);
                    }}
                    placeholder={t.geminiKeyPlaceholder}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-black/50 border border-white/15 focus:border-[#88aaff] focus:ring-1 focus:ring-[#88aaff] text-sm text-white placeholder-white/30 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 text-white/50 hover:text-white transition-colors p-1"
                    title={showKey ? "Ocultar chave" : "Mostrar chave"}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
                  {t.geminiModelLabel}
                </label>
                <div className="space-y-2">
                  {MODEL_OPTIONS.map((m) => (
                    <label
                      key={m.id}
                      onClick={() => setInputModel(m.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        inputModel === m.id
                          ? "bg-indigo-500/15 border-[#88aaff]"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="gemini-model"
                        value={m.id}
                        checked={inputModel === m.id}
                        onChange={() => setInputModel(m.id)}
                        className="mt-1 accent-[#88aaff]"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>{m.name}</span>
                          <span className="text-[10px] text-[#88aaff]">{m.tag}</span>
                        </div>
                        <p className="text-white/50 text-[11px] mt-0.5">{m.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Ollama Settings View */}
          {inputProvider === "ollama" && (
            <>
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
                    {t.ollamaUrlLabel}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputOllamaUrl}
                      onChange={(e) => setInputOllamaUrl(e.target.value)}
                      placeholder={t.ollamaUrlPlaceholder}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-[#88aaff] text-sm text-white font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCheckOllama}
                      disabled={isCheckingOllama}
                      className="px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-[#88aaff] border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isCheckingOllama ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t.checkingOllama}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.checkOllamaBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                  {ollamaCheckStatus && (
                    <p className="text-xs text-indigo-300 mt-2 font-medium bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20">
                      {ollamaCheckStatus}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
                    {t.ollamaModelLabel}
                  </label>
                  {ollamaModels.length > 0 ? (
                    <select
                      value={inputOllamaModel}
                      onChange={(e) => setInputOllamaModel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-sm text-white font-mono outline-none focus:border-[#88aaff]"
                    >
                      {ollamaModels.map((m) => (
                        <option key={m.name} value={m.name} className="bg-zinc-900 text-white">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={inputOllamaModel}
                      onChange={(e) => setInputOllamaModel(e.target.value)}
                      placeholder="Ex: qwen2-audio, whisper, llama3.2-vision..."
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-sm text-white font-mono outline-none focus:border-[#88aaff]"
                    />
                  )}
                  <p className="text-[11px] text-white/40 mt-1.5">
                    Selecione um modelo local pré-instalado do Ollama com suporte a áudio/multimodal.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* App Language Selection */}
          <div className="mb-6 pt-4 border-t border-white/10">
            <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#88aaff]" />
              {t.languageLabel}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setInputLanguage(lang.code)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    inputLanguage === lang.code
                      ? "bg-indigo-500/25 border-[#88aaff] text-white shadow-[0_0_10px_rgba(136,170,255,0.3)]"
                      : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="text-xs font-bold text-white">{lang.name}</span>
                  <span className="text-[10px] text-white/40">{lang.nativeName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Verify Status Feedback */}
          {verifyStatus && (
            <div
              className={`mb-6 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                verifyStatus.valid
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {verifyStatus.valid ? (
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{verifyStatus.message}</div>
            </div>
          )}

          {/* Save Success Badge */}
          {saveSuccess && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{t.savedSuccess}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex gap-2">
              {inputKey && inputProvider === "gemini" && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.removeBtn}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isVerifying || (inputProvider === "gemini" && !inputKey.trim())}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white/80 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#88aaff]" />
                    <span>{t.testingKey}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#88aaff]" />
                    <span>{t.testKeyBtn}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-all cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#88aaff] hover:bg-[#99bbff] text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(136,170,255,0.3)] flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t.saveBtn}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
