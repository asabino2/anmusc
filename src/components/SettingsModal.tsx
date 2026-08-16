import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Key, Eye, EyeOff, Check, X, AlertCircle, ExternalLink, ShieldCheck, RefreshCw, Trash2, Cpu } from "lucide-react";

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
  apiKey: string;
  onSaveApiKey: (newKey: string) => void;
  selectedModel: string;
  onSaveModel: (model: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  selectedModel,
  onSaveModel,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputModel, setInputModel] = useState(selectedModel || "gemini-3.6-flash");
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    tested: boolean;
    valid: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
    setInputModel(selectedModel || "gemini-3.6-flash");
    setVerifyStatus(null);
  }, [apiKey, selectedModel, isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!inputKey || inputKey.trim() === "") {
      setVerifyStatus({
        tested: true,
        valid: false,
        message: "Por favor, digite uma chave API antes de testar.",
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const response = await fetch("/api/verify-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: inputKey.trim(),
          model: inputModel,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setVerifyStatus({
          tested: true,
          valid: true,
          message: data.message || `Chave API e modelo (${inputModel}) validados com sucesso!`,
        });
      } else {
        setVerifyStatus({
          tested: true,
          valid: false,
          message: data.error || "Chave API inválida ou sem permissão para o modelo.",
        });
      }
    } catch (err: any) {
      setVerifyStatus({
        tested: true,
        valid: false,
        message: "Não foi possível comunicar com o servidor para validar a chave.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    const trimmedKey = inputKey.trim();
    onSaveApiKey(trimmedKey);
    onSaveModel(inputModel);

    // Save to server .env / settings
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmedKey, model: inputModel }),
      });
    } catch (e) {
      console.warn("Could not persist key/model to server:", e);
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

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "", model: inputModel }),
      });
    } catch (e) {
      console.warn("Could not remove key on server:", e);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 text-white bg-[#0e0e12] max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[#88aaff]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white font-sans">
                Configurações da API & Modelo
              </h3>
              <p className="text-xs text-white/60">
                Gerencie sua chave API e escolha o modelo Google Gemini
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/70 leading-relaxed space-y-2">
            <p>
              Este aplicativo requer uma <strong className="text-white">Chave API do Google Gemini</strong> para realizar as transcrições de letras, cálculo de BPM e análises musicais.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#88aaff] hover:underline font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Obter chave API gratuita no Google AI Studio
            </a>
          </div>

          {/* API Key Input Field */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
              Sua Chave API do Gemini (AIzaSy...)
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setVerifyStatus(null);
                }}
                placeholder="Cole sua API Key do Gemini aqui..."
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

          {/* AI Model Selection Section */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#88aaff]" />
              Escolha do Modelo Gemini
            </label>
            <div className="space-y-2.5">
              {MODEL_OPTIONS.map((m) => (
                <label
                  key={m.id}
                  onClick={() => setInputModel(m.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    inputModel === m.id
                      ? "bg-indigo-500/15 border-[#88aaff] shadow-[0_0_15px_rgba(136,170,255,0.15)]"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="gemini-model"
                    value={m.id}
                    checked={inputModel === m.id}
                    onChange={() => setInputModel(m.id)}
                    className="mt-1 text-[#88aaff] focus:ring-[#88aaff] accent-[#88aaff]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white font-sans">{m.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          inputModel === m.id
                            ? "bg-[#88aaff]/20 text-[#88aaff] border-[#88aaff]/40"
                            : "bg-white/5 text-white/50 border-white/10"
                        }`}
                      >
                        {m.tag}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{m.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Verify status feedback */}
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

          {/* Save success badge */}
          {saveSuccess && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex gap-2">
              {inputKey && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Remover chave salva"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isVerifying || !inputKey.trim()}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white/80 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#88aaff]" />
                    <span>Testando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#88aaff]" />
                    <span>Testar Chave</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!inputKey.trim()}
                className="px-5 py-2 rounded-xl bg-[#88aaff] hover:bg-[#99bbff] disabled:opacity-40 text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(136,170,255,0.3)] flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
