export interface VoiceProfile {
  id: string;
  fullName: string;
  labelMyanmar: string;
  gender: 'male' | 'female';
  desc: string;
  badge: string;
  pitch: number;
  rateModifier: number;
  frequency: number;
}

export type RecapStyleId = 'hook' | 'full' | 'quick';

export interface RecapStyleOption {
  id: RecapStyleId;
  label: string;
  title: string;
  desc: string;
  icon: string;
  badge: string;
}

export interface SubtitleCue {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  startDisplay: string; // '00:00'
  endDisplay: string;   // '00:05'
  text: string;
  speakerGender?: 'male' | 'female' | 'auto';
  character?: string;
}

export interface WatermarkSettings {
  enabled: boolean;
  type: 'blur' | 'solid' | 'gradient';
  position: 'bottom' | 'top' | 'custom';
  bottomPercent: number;
  heightPercent: number;
  blurAmount: number;
  opacity: number;
}

export interface SubtitleStyleSettings {
  fontFamily: 'Noto Sans Myanmar' | 'Padauk' | 'system-ui';
  fontNameLabel: string;
  fontSize: number; // in px or scale
  textColor: string;
  strokeColor: string;
  bgColor: string;
  position: 'bottom-safe' | 'bottom' | 'center' | 'top';
  animation: 'fade' | 'pop' | 'none';
  showShadow: boolean;
}

export interface MoviePreset {
  id: string;
  title: string;
  titleMm: string;
  genre: string;
  hookMm: string;
  synopsisMm: string;
  tags: string[];
}

export type TitleMode = 'auto' | 'manual';

export type DurationScope = 'shorts' | 'long_30m' | 'feature_full';

export interface MovieChunk {
  chunkIndex: number;
  totalChunks: number;
  partName: string;
  timeRange: string;
  text: string;
  subtitles: SubtitleCue[];
}

export interface ChunkProgress {
  currentChunk: number;
  totalChunks: number;
  currentPartName: string;
  percent: number;
  statusText: string;
}
