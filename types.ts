
export interface Track {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  genre?: string;
  exclusive?: boolean;
  isLocal?: boolean;
}

export interface VibeAnalysis {
  mood: string;
  colorPalette: string[];
  description: string;
  energyLevel: number; // 1-10
}

export interface LyricsResponse {
  lyrics: string;
}

export type VisualizerStyle = 'bars' | 'wave' | 'dots';

export interface VisualizerTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  style: VisualizerStyle;
}
