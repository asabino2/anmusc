import { useState } from "react";
import { MusicAnalysis } from "../types";
import { motion } from "motion/react";
import {
  Copy,
  Check,
  Download,
  Music,
  Flame,
  User,
  Radio,
  Info,
  Sparkles,
  ListMusic,
  Globe,
  Calendar,
  Sliders,
  Star,
  Award,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { SupportedLanguage, TRANSLATIONS } from "../i18n/translations";
import AudioPlayerBar from "./AudioPlayerBar";

interface AnalysisResultProps {
  key?: string;
  analysis: MusicAnalysis;
  songTitle?: string;
  songArtist?: string;
  audioUrl?: string | null;
  language?: SupportedLanguage;
}

function StreamingButtons({ links }: { links?: { spotify?: string; youtubeMusic?: string; itunes?: string } }) {
  if (!links || (!links.spotify && !links.youtubeMusic && !links.itunes)) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2.5">
      {links.youtubeMusic && (
        <a
          href={links.youtubeMusic}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          title="Ouvir no YouTube Music"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
          </svg>
          <span>YouTube Music</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      )}

      {links.spotify && (
        <a
          href={links.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          title="Ouvir no Spotify"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.467-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.722 1.122.294.18.386.563.207.847zm1.226-2.72c-.226.367-.706.482-1.073.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.125-.848-.106-.973-.519-.125-.413.106-.848.519-.973 3.632-1.102 8.147-.568 11.235 1.328.367.226.482.707.257 1.073zm.105-2.835C14.692 8.95 8.375 8.74 4.717 9.852c-.497.15-1.022-.132-1.173-.629-.15-.497.132-1.022.629-1.173 4.204-1.277 11.186-1.037 15.65 1.613.447.265.592.844.327 1.291-.265.447-.844.593-1.291.327z"/>
          </svg>
          <span>Spotify</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      )}

      {links.itunes && (
        <a
          href={links.itunes}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          title="Ouvir no Apple Music / iTunes"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M20 3v12.5a3.5 3.5 0 11-2-3.14V7.5l-10 2v7a3.5 3.5 0 11-2-3.14V3l14-2z" />
          </svg>
          <span>Apple Music</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      )}
    </div>
  );
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

  const rating = analysis.rating;
  const overallScore = rating?.overallScore ?? 8.5;
  const scorePercentage = Math.min(100, Math.max(0, Math.round(overallScore * 10)));
  const isHighRating = overallScore >= 8.0;
  const isMidRating = overallScore >= 6.0 && overallScore < 8.0;

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

      {/* NEW: Music Score & Critical Feedback Section Header */}
      {rating && (
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-br from-amber-500/[0.03] via-indigo-950/20 to-black space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Star className="w-7 h-7 fill-amber-400/20" />
              </div>
              <div>
                <h3 className="font-sans font-black text-xl text-white tracking-tight flex items-center gap-2">
                  {t.scoreTitle || "Pontuação & Análise Crítica"}
                </h3>
                <p className="text-xs text-white/50 font-medium mt-0.5">
                  {t.scoreSub || "Avaliação técnica e artística detalhada da gravação"}
                </p>
              </div>
            </div>

            {/* Overall Score Badge */}
            <div className="flex items-center gap-4 bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.08] shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                  {t.overallScoreLabel || "Nota Geral"}
                </div>
                <div className="text-xs font-semibold text-white/70">
                  {isHighRating ? "Excelente Qualidade" : isMidRating ? "Boa Produção" : "Requer Ajustes"}
                </div>
              </div>

              <div className={`px-4 py-2 rounded-2xl border flex items-baseline gap-1 font-black text-2xl md:text-3xl shadow-lg ${
                isHighRating
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10"
                  : isMidRating
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10"
              }`}>
                <span>{overallScore.toFixed(1)}</span>
                <span className="text-xs font-normal opacity-70">/ 10</span>
              </div>
            </div>
          </div>

          {/* Breakdown Sub-scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/70 font-medium">{t.vocalsScoreLabel || "Vocal & Afinação"}</span>
                <span className="font-mono font-bold text-indigo-400">{rating.vocalsScore ?? 85}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rating.vocalsScore ?? 85}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/70 font-medium">{t.rhythmScoreLabel || "Ritmo & Tempo"}</span>
                <span className="font-mono font-bold text-[#88aaff]">{rating.rhythmScore ?? 90}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rating.rhythmScore ?? 90}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="h-full bg-gradient-to-r from-[#88aaff] to-cyan-500 rounded-full"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/70 font-medium">{t.productionScoreLabel || "Produção & Mixagem"}</span>
                <span className="font-mono font-bold text-amber-400">{rating.productionScore ?? 80}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rating.productionScore ?? 80}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/70 font-medium">{t.compositionScoreLabel || "Composição & Estrutura"}</span>
                <span className="font-mono font-bold text-emerald-400">{rating.compositionScore ?? 88}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rating.compositionScore ?? 88}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Grid of Strengths, Issues & Improvements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
            {/* Strengths / Pontos Fortes */}
            {rating.strengths && rating.strengths.length > 0 && (
              <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t.strengthsTitle || "Pontos Fortes & Destaques"}
                </h4>
                <ul className="space-y-2.5">
                  {rating.strengths.map((strength, idx) => (
                    <li key={idx} className="text-xs text-white/80 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detected Issues / O Que Pode Estar Errado */}
            {rating.potentialIssues && rating.potentialIssues.length > 0 && (
              <div className="p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  {t.issuesTitle || "O Que Pode Estar Errado / Problemas Detectados"}
                </h4>
                <ul className="space-y-2.5">
                  {rating.potentialIssues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-white/80 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions for Improvement / Sugestões de Melhoria */}
            {rating.improvements && rating.improvements.length > 0 && (
              <div className="p-5 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/20 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#88aaff] font-bold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#88aaff]" />
                  {t.improvementsTitle || "Sugestões de Melhoria"}
                </h4>
                <ul className="space-y-2.5">
                  {rating.improvements.map((improvement, idx) => (
                    <li key={idx} className="text-xs text-white/80 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#88aaff] shrink-0 mt-1.5"></span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Expert Feedback Evaluation Summary */}
          {rating.feedback && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/70 leading-relaxed space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400/90 font-bold flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5" />
                {t.feedbackTitle || "Parecer Técnico Detalhado"}
              </span>
              <p className="italic">{rating.feedback}</p>
            </div>
          )}
        </div>
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
                  {analysis.songIdentificationType === "recognized" && (
                    <StreamingButtons links={analysis.streamingLinks} />
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
              <div className="space-y-2.5">
                {analysis.similarSongs.map((sim, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/90 font-bold tracking-tight">{sim.name}</span>
                      <span className="font-mono font-bold text-pink-400 text-[11px] bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20 shrink-0">
                        {sim.similarity}% match
                      </span>
                    </div>
                    {sim.streamingLinks && (
                      <StreamingButtons links={sim.streamingLinks} />
                    )}
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
