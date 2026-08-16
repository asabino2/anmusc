import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Square, Sparkles, Volume2, AlertCircle, RefreshCw } from "lucide-react";

import { SupportedLanguage, TRANSLATIONS } from "../i18n/translations";

interface MicListenerProps {
  onAudioCaptured: (blob: Blob, base64Data: string, mimeType: string) => void;
  disabled?: boolean;
  language?: SupportedLanguage;
}

export default function MicListener({ onAudioCaptured, disabled, language = "en" }: MicListenerProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerIntervalRef = useRef<any>(null);

  const RECORD_MAX_SECONDS = 12;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const getAudioStream = async (): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
      },
    };

    // Standard modern mediaDevices API
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      return await navigator.mediaDevices.getUserMedia(constraints);
    }

    // Legacy vendor-prefixed getUserMedia fallback (older Android WebViews / Safari)
    const legacyGetUserMedia =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;

    if (legacyGetUserMedia) {
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
      });
    }

    // Diagnostic error for mobile browsers accessing over insecure HTTP IP
    const isSecureContext =
      window.isSecureContext ||
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isSecureContext) {
      throw new Error(
        "A gravação via microfone no smartphone exige conexão segura (HTTPS). Navegadores mobile (Safari/Chrome) bloqueiam a captura de áudio ao acessar por IP na rede local via HTTP sem HTTPS. Acesse via HTTPS ou localhost."
      );
    }

    throw new Error("Seu navegador não suporta captura de áudio via microfone.");
  };

  const startListening = async () => {
    setMicError(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    try {
      const stream = await getAudioStream();
      streamRef.current = stream;

      // Setup Web Audio API Analyser for real-time visualizer feedback
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch (e) {
        console.warn("Analyser setup error", e);
      }

      // Determine supported mimeType cross-platform (iOS Safari, Android Chrome)
      let selectedMimeType = "";
      if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
        const candidateTypes = [
          "audio/webm;codecs=opus",
          "audio/mp4",
          "audio/aac",
          "audio/webm",
          "audio/ogg",
          "audio/wav",
        ];
        for (const type of candidateTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }
      }

      const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      const activeMimeType = mediaRecorder.mimeType || selectedMimeType || "audio/webm";
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: activeMimeType });
        stopRecordingCleanup();
        setIsRecording(false);

        if (recordedBlob.size < 1000) {
          setMicError("Nenhum áudio suficiente foi captado. Tente novamente mais perto da fonte sonora.");
          return;
        }

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(recordedBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onAudioCaptured(recordedBlob, base64data, activeMimeType);
        };
      };

      mediaRecorder.start(250); // collect 250ms chunks
      setIsRecording(true);

      // Start timer
      let seconds = 0;
      timerIntervalRef.current = setInterval(() => {
        seconds += 1;
        setRecordingTime(seconds);
        if (seconds >= RECORD_MAX_SECONDS) {
          stopListening();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      stopRecordingCleanup();
      setIsRecording(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicError("Permissão de microfone negada. Por favor, autorize o acesso ao microfone no navegador.");
      } else {
        setMicError(err.message || "Erro ao iniciar captura do microfone.");
      }
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4">
      {micError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-800/30 text-red-200 text-xs flex items-start gap-3 shadow-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-red-300">Erro no Microfone</span>
            <span>{micError}</span>
          </div>
          <button
            onClick={() => setMicError(null)}
            className="text-red-400 hover:text-red-200 text-[10px] underline cursor-pointer"
          >
            Fechar
          </button>
        </motion.div>
      )}

      {/* Shazam Big Central Pulse Orb */}
      <div className="relative flex items-center justify-center my-6">
        {/* Animated Sound Wave Ripples when recording */}
        {isRecording && (
          <>
            <motion.div
              animate={{ scale: [1, 1.45, 1.8], opacity: [0.6, 0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-indigo-500/30 to-[#88aaff]/30 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1.6], opacity: [0.7, 0.4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
              className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-purple-500/30 to-pink-500/30 pointer-events-none"
            />
          </>
        )}

        {/* Main Listening Orb Button */}
        <motion.button
          disabled={disabled}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          onClick={isRecording ? stopListening : startListening}
          className={`relative z-10 w-36 h-36 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl border ${
            isRecording
              ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-white/30 shadow-[0_0_50px_rgba(136,170,255,0.4)]"
              : "bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-[#88aaff]/50 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          }`}
          style={{
            transform: isRecording ? `scale(${1 + audioVolume * 0.002})` : undefined,
          }}
          title={isRecording ? "Clique para identificar agora" : "Clique para ouvir música ambiente"}
        >
          {isRecording ? (
            <>
              <div className="relative">
                <Mic className="w-12 h-12 text-white animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white mt-2">
                Ouvindo...
              </span>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1 text-[#88aaff] group-hover:text-white">
                <Mic className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-white tracking-tight">
                Toque para Ouvir
              </span>
              <span className="text-[10px] text-white/50 font-mono">Modo Shazam</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Dynamic Status / Visualizer Bars */}
      {isRecording ? (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 mt-3 w-full max-w-xs"
        >
          {/* Animated EQ Bars */}
          <div className="flex items-center gap-1.5 h-6">
            {[40, 75, 100, 60, 85, 95, 50, 80, 65, 90, 70, 45].map((height, i) => (
              <motion.div
                key={i}
                animate={{
                  height: [
                    `${Math.max(6, Math.round(height * (audioVolume / 100)))}px`,
                    `${Math.max(4, Math.round(height * 0.4 + 4))}px`,
                    `${Math.max(8, Math.round(height * 0.9))}px`,
                  ],
                }}
                transition={{
                  duration: 0.4 + (i % 4) * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-1 bg-gradient-to-t from-indigo-500 to-[#88aaff] rounded-full"
              />
            ))}
          </div>

          {/* Time and Finish Button */}
          <div className="flex items-center justify-between w-full px-2 mt-1">
            <span className="text-xs font-mono font-bold text-white/70">
              00:{recordingTime.toString().padStart(2, "0")} / 00:{RECORD_MAX_SECONDS}
            </span>
            <button
              onClick={stopListening}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/15 cursor-pointer transition-all"
            >
              <Square className="w-3 h-3 fill-current text-white" />
              Identificar Agora
            </button>
          </div>

          <p className="text-[11px] text-white/50 text-center">
            Aponte o microfone para a caixa de som ou música tocando no ambiente
          </p>
        </motion.div>
      ) : (
        <p className="text-xs text-white/50 text-center max-w-sm mt-2 leading-relaxed">
          Identificação em tempo real por áudio ambiente. Aproxime seu dispositivo da música e clique no botão acima.
        </p>
      )}
    </div>
  );
}
