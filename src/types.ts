export interface SingerInfo {
  name: string;
  gender?: string;
  estimatedAge?: string;
  estimatedNationality?: string;
}

export interface SimilarSong {
  name: string;
  similarity: number;
}

export interface MusicAnalysis {
  songName: string;
  songIdentificationType: "recognized" | "estimate";
  lyrics: string;
  bpm: number;
  styles: string[];
  singers: (string | SingerInfo)[];
  genres: string[];
  tags: string[];
  summary: string;
  similarSongs: SimilarSong[];
}

export interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  description: string;
  analysis: MusicAnalysis;
}
