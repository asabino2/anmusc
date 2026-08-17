export interface SingerInfo {
  name: string;
  gender?: string;
  estimatedAge?: string;
  estimatedNationality?: string;
  photoUrl?: string;
}

export interface StreamingLinks {
  spotify?: string;
  youtubeMusic?: string;
  itunes?: string;
}

export interface SimilarSong {
  name: string;
  similarity: number;
  streamingLinks?: StreamingLinks;
}

export interface DetectedInstrument {
  name: string;
  percentage: number;
}

export interface MusicRating {
  overallScore: number; // 0 to 10 scale (e.g., 8.5)
  vocalsScore?: number; // 0 to 100
  rhythmScore?: number; // 0 to 100
  productionScore?: number; // 0 to 100
  compositionScore?: number; // 0 to 100
  strengths: string[];
  improvements: string[];
  potentialIssues: string[];
  feedback: string;
}

export interface MusicAnalysis {
  songName: string;
  songIdentificationType: "recognized" | "lyric_match" | "estimate";
  lyricMatchPercentage?: number;
  matchedLyricPhrases?: string[];
  albumCoverUrl?: string;
  albumName?: string;
  releaseYear?: string;
  artistName?: string;
  lyrics: string;
  bpm: number;
  styles: string[];
  singers: SingerInfo[];
  genres: string[];
  instruments?: DetectedInstrument[];
  tags: string[];
  rating?: MusicRating;
  summary: string;
  similarSongs: SimilarSong[];
  streamingLinks?: StreamingLinks;
}

export interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  description: string;
  coverArtUrl?: string;
  analysis: MusicAnalysis;
}

export type AIProvider = "gemini" | "openrouter" | "ollama";

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  description?: string;
  inputModalities?: string[];
}

