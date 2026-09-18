import React, { useRef, useState } from 'react';
import {
  Film,
  UploadCloud,
  FileText,
  Sparkles,
  RefreshCw,
  Video,
  X,
  Bot,
  Keyboard,
  Clock,
  CheckCircle,
  Tag,
  Loader2,
  Wand2,
} from 'lucide-react';
import { MOVIE_PRESETS } from '../data/constants';
import { MoviePreset, TitleMode, DurationScope } from '../types';
import { TitleDetectionResult } from '../utils/recapGenerator';

interface InputCardProps {
  movieTitle: string;
  onChangeMovieTitle: (val: string) => void;
  titleMode: TitleMode;
  onChangeTitleMode: (mode: TitleMode) => void;
  durationScope: DurationScope;
  onChangeDurationScope: (scope: DurationScope) => void;
  videoFile: File | null;
  videoUrl: string | null;
  onSelectVideoFile: (file: File) => void;
  onRemoveVideoFile: () => void;
  customNotes: string;
  onChangeCustomNotes: (val: string) => void;
  onSelectPreset: (preset: MoviePreset) => void;
  onResetAll: () => void;
  onAutoDetectTitle: () => void;
  isDetectingTitle: boolean;
  detectedInfo: TitleDetectionResult | null;
  onAutoTranscribeVideo?: () => void;
  isTranscribingVideo?: boolean;
  transcriptionProgress?: string;
  onImportSrt?: (srtText: string) => void;
}

export const InputCard: React.FC<InputCardProps> = ({
  movieTitle,
  onChangeMovieTitle,
  titleMode,
  onChangeTitleMode,
  durationScope,
  onChangeDurationScope,
  videoFile,
  videoUrl,
  onSelectVideoFile,
  onRemoveVideoFile,
  customNotes,
  onChangeCustomNotes,
  onSelectPreset,
  onResetAll,
  onAutoDetectTitle,
  isDetectingTitle,
  detectedInfo,
  onAutoTranscribeVideo,
  isTranscribingVideo = false,
  transcriptionProgress = '',
  onImportSrt,
}) => {
  const [activeTab, setActiveTab] = useState<'title' | 'file' | 'notes'>('title');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onSelectVideoFile(file);
      } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.srt')) {
        readTextFile(file);
      }
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectVideoFile(e.target.files[0]);
    }
  };

  const readTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        if ((file.name.endsWith('.srt') || file.name.endsWith('.vtt') || content.includes('-->')) && onImportSrt) {
          onImportSrt(content);
        }
        onChangeCustomNotes(content);
        if (!movieTitle) {
          const guessedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          onChangeMovieTitle(guessedTitle);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleTextFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readTextFile(e.target.files[0]);
    }
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-[#15122b] to-[#0f0e21] border border-purple-800/40 p-5 sm:p-6 shadow-xl shadow-purple-950/40">
      {/* Background soft glow */}
      <div className="absolute -top-10 right-10 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Required Section Header: Exact match */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-purple-900/30">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-100">
            <span>🎬</span>
            <span>ဇာတ်ကားအမည် (သို့) ဖိုင်ကို ဤနေရာတွင် တင်ပါ</span>
          </h2>
          <p className="text-xs sm:text-sm text-purple-300/80 mt-1">
            ဗီဒီယို၊ စာသားဖိုင် (သို့) ဇာတ်လမ်းခေါင်းစဉ်ကို ထည့်သွင်းနိုင်ပါသည်
          </p>
        </div>

        {/* Reset / Re-input button */}
        {(movieTitle || videoFile || customNotes) && (
          <button
            id="reset-input-btn"
            onClick={onResetAll}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-pink-300 px-2.5 py-1 rounded-md bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/30 transition"
            title="Clear and re-enter"
          >
            <RefreshCw className="w-3 h-3" />
            <span>အသစ်ပြန်စရန် (Clear)</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-purple-900/30 pb-2">
        <button
          onClick={() => setActiveTab('title')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'title'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-purple-950/30'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-pink-400" />
          <span>ဇာတ်ကားအမည် (Title Mode)</span>
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'file'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-purple-950/30'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
          <span>ဗီဒီယို / ဖိုင်တင်ရန် (Upload)</span>
          {videoFile && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'notes'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-purple-950/30'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>စာသားမှတ်စု (Notes)</span>
          {customNotes && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
        </button>
      </div>

      {/* Tab 1: Movie Title (Hybrid Mode: Auto vs Manual) */}
      {activeTab === 'title' && (
        <div className="space-y-4">
          {/* Hybrid Mode Switcher (Required) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#0b0c1c] border border-purple-800/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
              <span>ခေါင်းစဉ်ရွေးချယ်စနစ် (Hybrid Mode):</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#14122d] p-1 rounded-lg border border-purple-900/60">
              {/* 1. Auto Mode Toggle */}
              <button
                type="button"
                id="mode-auto-btn"
                onClick={() => onChangeTitleMode('auto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  titleMode === 'auto'
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>၁။ Auto Mode (အလိုအလျောက်)</span>
              </button>

              {/* 2. Manual Mode Toggle */}
              <button
                type="button"
                id="mode-manual-btn"
                onClick={() => onChangeTitleMode('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  titleMode === 'manual'
                    ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>၂။ Manual Mode (ကိုယ်တိုင်ရိုက်ထည့်ရန်)</span>
              </button>
            </div>
          </div>

          {/* 1. Auto Mode Display */}
          {titleMode === 'auto' ? (
            <div className="space-y-3 p-4 rounded-xl bg-purple-950/30 border border-fuchsia-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-fuchsia-300">
                    AI Auto-Detection System
                  </span>
                </div>

                <button
                  type="button"
                  id="detect-title-btn"
                  onClick={onAutoDetectTitle}
                  disabled={isDetectingTitle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-fuchsia-950/40 transition active:scale-95 disabled:opacity-60"
                >
                  {isDetectingTitle ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-yellow-300" />
                  )}
                  <span>
                    {isDetectingTitle ? 'စစ်ဆေးနေပါသည်...' : '⚡ AI ဖြင့် အလိုအလျောက် စစ်ဆေးမည်'}
                  </span>
                </button>
              </div>

              {/* Detected Title Result Box */}
              <div className="p-3.5 rounded-xl bg-[#090a18] border border-purple-800/60 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-purple-400 font-medium">
                      အလိုအလျောက် စစ်ဆေးတွေ့ရှိသော ဇာတ်ကားအမည်:
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-100 mt-0.5">
                      {movieTitle || 'ဗီဒီယိုဖိုင်တင်ပါ သို့မဟုတ် စစ်ဆေးခလုတ်ကို နှိပ်ပါ'}
                    </h3>
                  </div>
                  {detectedInfo && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-900/60 text-purple-200 border border-purple-700/50">
                      {detectedInfo.year}
                    </span>
                  )}
                </div>

                {detectedInfo && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-900/40 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-pink-400" />
                      <span>{detectedInfo.genre}</span>
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{detectedInfo.myanmarTitle}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-purple-300/80">
                <span>
                  💡 ဗီဒီယိုဖိုင် သို့မဟုတ် ဖိုင်အမည်ကို အခြေခံပြီး AI က ဇာတ်ကားအမည်ကို တိုက်ရိုက်ဖော်ပြပေးပါသည်
                </span>
                <button
                  type="button"
                  onClick={() => onChangeTitleMode('manual')}
                  className="text-pink-400 hover:underline font-medium shrink-0 ml-2"
                >
                  ကိုယ်တိုင် ပြင်ဆင်လိုပါက Manual သို့ ပြောင်းပါ ➔
                </button>
              </div>
            </div>
          ) : (
            /* 2. Manual Mode (Direct Text Input) */
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-purple-200">
                ကိုယ်တိုင် စာသားရိုက်ထည့်ရန် Text Input Box:
              </label>
              <div className="relative">
                <input
                  id="movie-title-input"
                  type="text"
                  value={movieTitle}
                  onChange={(e) => onChangeMovieTitle(e.target.value)}
                  placeholder="ဥပမာ - Titanic, Inception, ဘူဆန်သို့ ရထားခရီး (သို့) ကြိုက်နှစ်သက်ရာ ဇာတ်ကား..."
                  className="w-full bg-[#0b0c1c] border border-purple-700/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 transition pr-10"
                />
                {movieTitle && (
                  <button
                    onClick={() => onChangeMovieTitle('')}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick presets */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-purple-300/80 mb-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>အမြန်စမ်းသပ်ရန် ရေပန်းစားသော ဇာတ်ကားများ (1-Click Presets):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MOVIE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      id={`preset-${preset.id}`}
                      onClick={() => onSelectPreset(preset)}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-purple-950/50 hover:bg-purple-900/70 border border-purple-800/40 hover:border-purple-600/60 text-slate-300 hover:text-white transition flex items-center gap-1.5 active:scale-95"
                    >
                      <span className="text-pink-400">★</span>
                      <span>{preset.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Long-form Video Processing / Chunking Scope Selector (Required) */}
          <div className="pt-3 border-t border-purple-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>ဗီဒီယို အလျားနှင့် အပိုင်းခွဲစနစ် (Chunking System / Video Scope):</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                ✓ တစ်ဝက်တစ်ပျက် မရပ်တန့်စေသော စနစ်
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                id="scope-shorts"
                onClick={() => onChangeDurationScope('shorts')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  durationScope === 'shorts'
                    ? 'bg-purple-900/60 border-fuchsia-500 text-white shadow-sm'
                    : 'bg-[#0a0b18] border-purple-900/40 text-slate-400 hover:border-purple-700/60'
                }`}
              >
                <p className="text-xs font-bold text-slate-100">📱 Shorts / Reels</p>
                <p className="text-[11px] text-purple-300/80 mt-0.5">၁ မှ ၃ မိနစ်စာ အကျဉ်း</p>
              </button>

              <button
                type="button"
                id="scope-30m"
                onClick={() => onChangeDurationScope('long_30m')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  durationScope === 'long_30m'
                    ? 'bg-purple-900/60 border-fuchsia-500 text-white shadow-sm'
                    : 'bg-[#0a0b18] border-purple-900/40 text-slate-400 hover:border-purple-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-100">🎬 30-Min Long Recap</p>
                  <span className="text-[10px] bg-pink-900/60 text-pink-300 px-1.5 py-0.2 rounded">3 Chunks</span>
                </div>
                <p className="text-[11px] text-purple-300/80 mt-0.5">နာရီဝက်စာ အပိုင်း ၃ ပိုင်း</p>
              </button>

              <button
                type="button"
                id="scope-feature"
                onClick={() => onChangeDurationScope('feature_full')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  durationScope === 'feature_full'
                    ? 'bg-purple-900/60 border-fuchsia-500 text-white shadow-sm'
                    : 'bg-[#0a0b18] border-purple-900/40 text-slate-400 hover:border-purple-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-100">🎞️ 1-Hour Full Feature</p>
                  <span className="text-[10px] bg-fuchsia-900/60 text-fuchsia-300 px-1.5 py-0.2 rounded">4 Chunks</span>
                </div>
                <p className="text-[11px] text-purple-300/80 mt-0.5">၁ နာရီစာ အစအဆုံး အပြည့်အစုံ</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: File Upload (Video or Text) */}
      {activeTab === 'file' && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragging
                ? 'border-fuchsia-400 bg-fuchsia-950/30'
                : 'border-purple-800/50 hover:border-purple-600/60 bg-[#0c0d1e]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/mkv"
              onChange={handleVideoSelect}
              className="hidden"
            />
            <input
              ref={textFileInputRef}
              type="file"
              accept=".txt,.srt,.vtt"
              onChange={handleTextFileSelect}
              className="hidden"
            />

            {videoFile ? (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-purple-950/60 border border-purple-700/50 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-800/50 flex items-center justify-center text-purple-300">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                        {videoFile.name}
                      </p>
                      <p className="text-[11px] text-purple-300/80">
                        {(videoFile.size / (1024 * 1024)).toFixed(2)} MB · ဗီဒီယို ဖတ်ရှုပြီးပါပြီ
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {onAutoTranscribeVideo && (
                      <button
                        type="button"
                        id="auto-transcribe-srt-btn"
                        onClick={onAutoTranscribeVideo}
                        disabled={isTranscribingVideo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95 disabled:opacity-60"
                      >
                        {isTranscribingVideo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        )}
                        <span>{isTranscribingVideo ? 'SRT ထုတ်ယူနေဆဲ...' : '⚡ ဗီဒီယိုပါအတိုင်း SRT Auto ထုတ်မည်'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onAutoDetectTitle}
                      className="px-2.5 py-1.5 rounded-lg bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-semibold transition"
                    >
                      AI ခေါင်းစဉ်ရှာ
                    </button>
                    <button
                      onClick={onRemoveVideoFile}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition"
                      title="Remove video"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar during auto transcription */}
                {isTranscribingVideo && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-left space-y-1.5 animate-pulse">
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>ဗီဒီယို အသံအတိုင်း စာတန်းထိုးနှင့် SRT ဖိုင် Auto တည်ဆောက်နေပါသည်</span>
                      </span>
                      <span className="text-[11px] text-emerald-400/80">Processing...</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 font-mono">
                      {transcriptionProgress || 'ဗီဒီယို အသံလှိုင်းကို ခွဲခြမ်းစိတ်ဖြာနေပါသည်...'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-purple-900/40 flex items-center justify-center text-fuchsia-300 border border-purple-700/30">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    ဗီဒီယိုဖိုင် ဆွဲထည့်ပါ (သို့မဟုတ်) ဖိုင်ရွေးချယ်ပါ
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    MP4, WebM, MOV သို့မဟုတ် .txt / .srt စာတန်းထိုးဖိုင်များ တင်သွင်းနိုင်ပါသည်
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-medium transition shadow-sm"
                  >
                    🎬 ဗီဒီယိုဖိုင် ရွေးချယ်ရန်
                  </button>
                  <button
                    type="button"
                    onClick={() => textFileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-200 text-xs font-medium border border-purple-800/40 transition"
                  >
                    📄 စာသား / SRT ဖိုင် ရွေးရန်
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Custom Notes & Plot Details */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          <label className="block text-xs text-purple-200/90 font-medium">
            ဇာတ်လမ်းအကျဉ်း သို့မဟုတ် အထူးအလေးထားလိုသည့် စာသားမှတ်စုများ (စိတ်ကြိုက်ပြင်ဆင်နိုင်သည်):
          </label>
          <textarea
            id="custom-notes-input"
            value={customNotes}
            onChange={(e) => onChangeCustomNotes(e.target.value)}
            rows={4}
            placeholder="ဥပမာ - ဇာတ်ကားထဲက အဓိကဇာတ်ကောင်ရဲ့ အမည်၊ လျှို့ဝှက်ချက်၊ သို့မဟုတ် ကိုယ်တိုင်ရေးသားထားသော ဇာတ်ညွှန်းစာသားကြမ်းများကို ထည့်သွင်းနိုင်ပါသည်..."
            className="w-full bg-[#0b0c1c] border border-purple-700/50 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 transition resize-y"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>စာလုံးအရေအတွက်: {customNotes.length}</span>
            {customNotes && (
              <button
                onClick={() => onChangeCustomNotes('')}
                className="text-pink-400 hover:underline"
              >
                စာသားဖျက်ရန်
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
