import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music, RotateCcw } from "lucide-react";

interface AudioPlayerBarProps {
  audioUrl: string;
  title?: string;
  artist?: string;
  subtitle?: string;
}

export default function AudioPlayerBar({ audioUrl, title, artist, subtitle }: AudioPlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="w-full glass-card rounded-2xl p-4 border border-white/10 shadow-xl bg-gradient-to-r from-indigo-950/30 via-black/50 to-black/70 flex flex-col md:flex-row items-center gap-4 relative overflow-hidden">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Album / Track info */}
      <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[#88aaff] shrink-0">
          <Music className="w-5 h-5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white truncate font-sans">
            {title || "Áudio Carregado"}
          </h4>
          <p className="text-[10px] text-white/50 truncate font-mono">
            {subtitle || artist || "Player de Áudio"}
          </p>
        </div>
      </div>

      {/* Play/Pause & Progress Controls */}
      <div className="flex-1 w-full flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#88aaff] hover:bg-[#99bbff] text-black flex items-center justify-center font-bold transition-all shadow-[0_0_15px_rgba(136,170,255,0.4)] shrink-0 cursor-pointer"
          title={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <span className="text-[10px] font-mono text-white/50 w-8 text-right shrink-0">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#88aaff]"
        />

        <span className="text-[10px] font-mono text-white/50 w-8 text-left shrink-0">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume control */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggleMute}
          className="text-white/60 hover:text-white transition-colors p-1"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#88aaff]" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-16 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#88aaff]"
        />
      </div>
    </div>
  );
}
