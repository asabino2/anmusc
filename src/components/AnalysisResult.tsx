import { useState } from "react";
import { MusicAnalysis } from "../types";
import { motion } from "motion/react";
import { Copy, Check, Download, Music, Flame, User, Radio, Tag, Info, Sparkles, ListMusic, Globe, Calendar, Sliders } from "lucide-react";
import { SupportedLanguage, TRANSLATIONS } from "../i18n/translations";
import AudioPlayerBar from "./AudioPlayerBar";

interface AnalysisResultProps {
  analysis: MusicAnalysis;
  songTitle?: string;
  songArtist?: string;
  audioUrl?: string | null;
  language?: SupportedLanguage;
}

export default function AnalysisResult({
  analysis,
  songTitle,
  songArtist,
  audioUrl,
  language = "en",
}: AnalysisResultProps) {
  const [copied, setCopied] = useState(false);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis.lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([analysis.lyrics], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${songTitle || "lyrics"}-suno-format.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Pulse duration in seconds based on BPM
  const pulseDuration = 60 / (analysis.bpm || 120);

  // Parse lyrics lines and highlight brackets
  const renderedLyrics = analysis.lyrics.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return (
        <div
          key={index}
          className="suno-bracket-tag text-indigo-300 font-serif font-bold text-sm tracking-wider my-4 bg-white/[0.02] px-3.5 py-1.5 rounded-lg border border-white/[0.04] w-fit select-none"
        >
          {trimmed}
        </div>
      );
    }
    return (
      <p key={index} className="text-white/70 text-sm md:text-base leading-relaxed min-h-[1.5rem] hover:text-white transition-colors duration-150">
        {line}
      </p>
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full"
    >
      {/* Audio Player Bar at the top of results */}
      {audioUrl && (
        <AudioPlayerBar
          audioUrl={audioUrl}
          title={analysis.songName || songTitle || "Áudio Carregado"}
          subtitle={songArtist || (analysis.songIdentificationType === "recognized" ? "Música Reconhecida" : "Análise em Reprodução")}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Left Column: Lyrics Sheet */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 md:p-8 flex flex-col h-[600px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-pink-500/80"></div>
          
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-sans font-bold text-base md:text-lg text-white flex items-center gap-2 tracking-tight">
                <Music className="w-5 h-5 text-[#88aaff]" />
                {t.lyricsTitle}
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mt-1">{t.lyricsSub}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/10 cursor-pointer"
                title={t.copyBtn}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.copiedBtn}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.copyBtn}</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/10 cursor-pointer"
                title={t.downloadBtn}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.downloadBtn}</span>
              </button>
            </div>
          </div>

          {/* Scrollable lyrics area */}
          <div className="flex-1 overflow-y-auto pr-3 space-y-1 custom-scrollbar">
            {renderedLyrics}
          </div>
        </div>

        {/* Right Column: Audio Analysis Dashboard */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Song Name, Cover Art & Identification Status Card */}
          {analysis.songName && (
            <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden shadow-xl bg-gradient-to-br from-indigo-950/30 via-black/50 to-black/80 space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#88aaff]" />
                  {analysis.songIdentificationType === "recognized" ? "RECOGNIZED TRACK" : "AI ESTIMATED TITLE"}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  analysis.songIdentificationType === "recognized"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                }`}>
                  {analysis.songIdentificationType === "recognized" ? "Match Recognized" : "AI Vibe Estimate"}
                </span>
              </div>

              <div className="flex gap-4 items-center">
                {analysis.albumCoverUrl && (
                  <div className="relative shrink-0 group">
                    <img
                      src={analysis.albumCoverUrl}
                      alt={analysis.songName}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-white/20 shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"></div>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                    {analysis.songName}
                  </h2>
                  {analysis.albumName && (
                    <p className="text-xs text-[#88aaff] font-semibold mt-1">
                      Álbum: {analysis.albumName} {analysis.releaseYear ? `(${analysis.releaseYear})` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BPM Card */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 flex items-center justify-between shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
                  className="w-5 h-5 rounded-full bg-indigo-400/80 shadow-[0_0_15px_rgba(129,140,248,0.8)]"
                ></motion.div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-indigo-400" />
                  {t.bpmTitle}
                </div>
                <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2 mt-0.5">
                  <span>{analysis.bpm}</span>
                  <span className="text-xs text-white/40 font-mono">BPM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vocalists & Singers Info Card with Photos */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#88aaff]" />
              {t.singersTitle}
            </h4>
            <div className="space-y-3">
              {analysis.singers.map((singer, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
                  {singer.photoUrl && (
                    <img
                      src={singer.photoUrl}
                      alt={singer.name}
                      className="w-11 h-11 rounded-full object-cover border border-white/20 shadow-md shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white tracking-tight truncate">{singer.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 shrink-0">
                        {singer.gender}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/60 font-medium pt-1 border-t border-white/[0.04] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-400" />
                        {singer.estimatedAge}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-indigo-400" />
                        {singer.estimatedNationality}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Genres & Styles */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              {t.genresTitle}
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.genres.map((g, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                  {g}
                </span>
              ))}
              {analysis.styles.map((s, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Detected Musical Instruments (With Percentages) */}
          {analysis.instruments && analysis.instruments.length > 0 && (
            <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#88aaff]" />
                {t.instrumentsTitle || "Instrumentos Detectados"}
              </h4>
              <div className="space-y-3">
                {analysis.instruments.map((inst, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/90 font-medium">{inst.name}</span>
                      <span className="font-mono font-bold text-[#88aaff]">{inst.percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, inst.percentage))}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-[#88aaff] via-indigo-500 to-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar Songs */}
          {analysis.similarSongs && analysis.similarSongs.length > 0 && (
            <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-2">
                <ListMusic className="w-3.5 h-3.5 text-pink-400" />
                {t.similarSongsTitle}
              </h4>
              <div className="space-y-2">
                {analysis.similarSongs.map((sim, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-xs">
                    <span className="text-white/90 font-medium">{sim.name}</span>
                    <span className="font-mono font-bold text-pink-400">{sim.similarity}% match</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Card */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-2 bg-white/[0.01]">
            <h4 className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              {t.summaryTitle}
            </h4>
            <p className="text-xs text-white/70 leading-relaxed italic">
              "{analysis.summary}"
            </p>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
