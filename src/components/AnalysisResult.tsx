import { useState } from "react";
import { MusicAnalysis } from "../types";
import { motion } from "motion/react";
import { Copy, Check, Download, Music, Flame, User, Radio, Tag, Info, Sparkles, ListMusic, Globe, Calendar } from "lucide-react";

interface AnalysisResultProps {
  analysis: MusicAnalysis;
  songTitle?: string;
  songArtist?: string;
}

export default function AnalysisResult({ analysis, songTitle, songArtist }: AnalysisResultProps) {
  const [copied, setCopied] = useState(false);

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
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full"
    >
      {/* Left Column: Lyrics Sheet */}
      <div className="lg:col-span-7 glass-card rounded-3xl p-6 md:p-8 flex flex-col h-[600px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-pink-500/80"></div>
        
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-sans font-bold text-base md:text-lg text-white flex items-center gap-2 tracking-tight">
              <Music className="w-5 h-5 text-[#88aaff]" />
              Letra Formatada (Suno.ai)
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mt-1">Estrutura de seções gerada com IA</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/10"
              title="Copiar letra"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/10"
              title="Baixar TXT"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar</span>
            </button>
          </div>
        </div>

        {/* Scrollable Lyrics Container */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 lyric-scroll font-sans">
          {renderedLyrics}
        </div>
      </div>

      {/* Right Column: Music Metadata Grid (Bento) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Track Title Card */}
        <div className="glass-card rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#88aaff]/10 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <Sparkles className="w-4 h-4 text-[#88aaff]" />
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white/50">Nome Identificado / Estimado</h4>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight accent-glow-text">
            {analysis.songName || "Música Desconhecida"}
          </h3>
          
          <div className="flex flex-wrap gap-2 items-center mt-3">
            {analysis.songIdentificationType === "recognized" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Check className="w-3 h-3" />
                Nome Real Reconhecido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sparkles className="w-3 h-3" />
                Estimativa da IA
              </span>
            )}
          </div>

          <p className="text-xs text-white/50 mt-3.5 leading-relaxed">
            Nome real oficial reconhecido no banco de dados de áudio comercial ou uma estimativa inteligente baseada na letra, voz e harmonia da faixa.
          </p>
        </div>

        {/* Dynamic BPM Card */}
        <div className="glass-card rounded-3xl p-6 shadow-xl relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50">BPM / ANDAMENTO</div>
            <h4 className="text-4xl font-mono font-black mt-2 flex items-baseline gap-2 accent-glow-text">
              {analysis.bpm} <span className="text-xs font-sans text-white/40 font-semibold tracking-wider uppercase">BPM</span>
            </h4>
            <p className="text-xs text-white/50 mt-1.5">Batidas por minuto detectadas no áudio</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 pr-2">
            <div className="relative flex items-center justify-center w-14 h-14">
              {/* Outer pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                transition={{
                  duration: pulseDuration,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute w-10 h-10 rounded-full bg-[#88aaff]/15"
              />
              {/* Inner solid pulsing beat */}
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: pulseDuration,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-8 h-8 rounded-full bg-[#88aaff] shadow-[0_0_15px_rgba(136,170,255,0.6)] flex items-center justify-center"
              >
                <Flame className="w-4 h-4 text-zinc-950" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Similar Songs Card */}
        {analysis.similarSongs && analysis.similarSongs.length > 0 && (
          <div className="glass-card rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
              <ListMusic className="w-4 h-4 text-[#88aaff]" />
              <h4 className="text-xs uppercase tracking-widest font-semibold text-white/50">Músicas Similares</h4>
            </div>
            <div className="flex flex-col gap-3.5">
              {analysis.similarSongs.map((song, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col gap-2 hover:bg-white/[0.04] transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm font-bold text-white/90 truncate pr-2">
                      {song.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#88aaff] shrink-0 bg-[#88aaff]/10 px-2.5 py-0.5 rounded-full border border-[#88aaff]/15">
                      {song.similarity}% similar
                    </span>
                  </div>
                  {/* Progress bar representing similarity */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-[#88aaff] rounded-full"
                      style={{ width: `${song.similarity}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Singers & Vocal Profile Card */}
        <div className="glass-card rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <User className="w-4 h-4 text-[#88aaff]" />
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white/50">CANTORAS / VOCALISTAS</h4>
          </div>
          <div className="flex flex-col gap-3">
            {analysis.singers && analysis.singers.length > 0 ? (
              analysis.singers.map((singerItem, i) => {
                const isObj = typeof singerItem === "object" && singerItem !== null;
                const name = isObj ? singerItem.name : String(singerItem);
                const gender = isObj ? singerItem.gender : null;
                const age = isObj ? singerItem.estimatedAge : null;
                const nationality = isObj ? singerItem.estimatedNationality : null;

                return (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2.5 hover:bg-white/[0.05] transition-all"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#88aaff] shadow-[0_0_8px_rgba(136,170,255,0.8)] shrink-0"></span>
                        <span className="text-sm font-bold text-white tracking-tight">{name}</span>
                      </div>
                      {gender && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                          {gender}
                        </span>
                      )}
                    </div>

                    {(age || nationality) && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
                        {age && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#88aaff]/10 border border-[#88aaff]/20 text-[#88aaff] text-[11px] font-medium">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>Idade Est.: <strong className="text-white">{age}</strong></span>
                          </div>
                        )}
                        {nationality && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
                            <Globe className="w-3 h-3 shrink-0" />
                            <span>Nacionalidade: <strong className="text-white">{nationality}</strong></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-white/40 italic">Nenhum vocal detectado (Instrumental)</span>
            )}
          </div>
        </div>

        {/* Genres & Styles Card */}
        <div className="glass-card rounded-3xl p-6 shadow-xl flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
              <Radio className="w-4 h-4 text-[#88aaff]" />
              <h4 className="text-xs uppercase tracking-widest font-semibold text-white/50">GÊNERO & ESTILO</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono">GÊNEROS PRINCIPAIS</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analysis.genres.map((genre, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-[#88aaff]/10 border border-[#88aaff]/25 text-xs text-[#88aaff] font-semibold uppercase tracking-wider"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono">PERFIL DE ESTILO / MOODS</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analysis.styles.map((style, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/80"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tags Cloud Card */}
        <div className="glass-card rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <Tag className="w-4 h-4 text-pink-400" />
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white/50">TAGS DE PRODUÇÃO</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.tags.map((tag, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-xl text-[11px] font-mono bg-white/[0.02] border border-white/[0.06] text-white/60 hover:text-[#88aaff] hover:border-[#88aaff]/30 transition-all cursor-default"
              >
                #{tag.toUpperCase().replace(/\s+/g, "")}
              </span>
            ))}
          </div>
        </div>

        {/* AI Summary Card */}
        <div className="glass-card rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#88aaff]/10 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <Info className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white/50">RESUMO DA ANALISE</h4>
          </div>
          <p className="text-xs md:text-sm text-white/80 leading-relaxed italic font-serif">
            "{analysis.summary}"
          </p>
        </div>
      </div>
    </motion.div>
  );
}
