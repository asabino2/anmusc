export interface SingerInfo {
  name: string;
  gender?: string;
  estimatedAge?: string;
  estimatedNationality?: string;
  photoUrl?: string;
}

export interface SimilarSong {
  name: string;
  similarity: number;
}

export interface DetectedInstrument {
  name: string;
  percentage: number;
}

export interface MusicAnalysis {
  songName: string;
  songIdentificationType: "recognized" | "estimate";
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
  summary: string;
  similarSongs: SimilarSong[];
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
