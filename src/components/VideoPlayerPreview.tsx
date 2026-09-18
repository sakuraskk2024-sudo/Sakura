import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Eye, EyeOff, Sliders, Type, Check, Maximize2 } from 'lucide-react';
import { SubtitleCue, SubtitleStyleSettings, WatermarkSettings, VoiceProfile } from '../types';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface VideoPlayerPreviewProps {
  aspectRatio: '9:16' | '16:9';
  videoUrl: string | null;
  movieTitle: string;
  subtitles: SubtitleCue[];
  activeVoice: VoiceProfile;
  speed: number;
  watermarkSettings: WatermarkSettings;
  onChangeWatermarkSettings: (settings: WatermarkSettings) => void;
  subtitleSettings: SubtitleStyleSettings;
  onChangeSubtitleSettings: (settings: SubtitleStyleSettings) => void;
  onSelectCue?: (cue: SubtitleCue) => void;
  autoGenderEnabled?: boolean;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  aspectRatio,
  videoUrl,
  movieTitle,
  subtitles,
  activeVoice,
  speed,
  watermarkSettings,
  onChangeWatermarkSettings,
  subtitleSettings,
  onChangeSubtitleSettings,
  onSelectCue,
  autoGenderEnabled = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [showWatermarkSettings, setShowWatermarkSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find active subtitle for current playback time
  const currentCue = subtitles.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  // Total calculated duration from last subtitle or video
  useEffect(() => {
    if (subtitles.length > 0) {
      const last = subtitles[subtitles.length - 1];
      if (last.endTime > 0) {
        setDuration(Math.max(videoRef.current?.duration || 0, last.endTime + 1));
      }
    }
  }, [subtitles]);

  // Handle Play/Pause synchronization
  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const lastSpokenCueIdRef = useRef<number | null>(null);

  const startPlayback = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      videoRef.current.play().catch(() => {});
    }

    const cueToSpeak = currentCue || subtitles[0];
    if (cueToSpeak) {
      lastSpokenCueIdRef.current = cueToSpeak.id;
      audioSynthesizer.speakNarration(cueToSpeak.text, activeVoice, speed, undefined, undefined, cueToSpeak, autoGenderEnabled);
    }
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    audioSynthesizer.stop();
  };

  const handleRestart = () => {
    setCurrentTime(0);
    lastSpokenCueIdRef.current = null;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    audioSynthesizer.stop();
    if (isPlaying) {
      startPlayback();
    }
  };

  // Video time update handler
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const next = videoRef.current.currentTime;
      setCurrentTime(next);
      const cue = subtitles.find((c) => next >= c.startTime && next <= c.endTime);
      if (cue && cue.id !== lastSpokenCueIdRef.current) {
        lastSpokenCueIdRef.current = cue.id;
        audioSynthesizer.speakNarration(cue.text, activeVoice, speed, undefined, undefined, cue, autoGenderEnabled);
      }
    }
  };

  // Simulated timer loop if using synthetic background (no custom video uploaded yet)
  useEffect(() => {
    let interval: any;
    if (isPlaying && !videoUrl) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * speed;
          if (next >= duration) {
            pausePlayback();
            return 0;
          }

          // Check if entered new subtitle cue to trigger voice narration line
          const newCue = subtitles.find((c) => next >= c.startTime && next <= c.endTime);
          if (newCue && newCue.id !== lastSpokenCueIdRef.current) {
            lastSpokenCueIdRef.current = newCue.id;
            audioSynthesizer.speakNarration(newCue.text, activeVoice, speed, undefined, undefined, newCue, autoGenderEnabled);
          }

          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, videoUrl, duration, speed, subtitles, activeVoice, autoGenderEnabled]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
    const cue = subtitles.find((c) => val >= c.startTime && val <= c.endTime);
    if (cue && isPlaying) {
      audioSynthesizer.speakNarration(cue.text, activeVoice, speed);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Format time display MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#141228] to-[#0f0e21] border border-purple-800/40 p-5 sm:p-6 shadow-xl shadow-purple-950/30 space-y-4">
      {/* Top Header of Preview Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/30">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>🎬</span>
            <span>ဗီဒီယို အကြိုကြည့်ရှုခြင်း (Video Player Preview)</span>
          </h3>
          <p className="text-xs text-purple-300/80 mt-0.5">
            {aspectRatio === '9:16' ? 'TikTok / Reels / Shorts 9:16 ဒေါင်လိုက်ပုံစံ' : '16:9 Cinema မျက်နှာပြင်ကျယ်'}
          </p>
        </div>

        {/* Action Toggles for Subtitles & Watermark */}
        <div className="flex items-center gap-2">
          {/* Watermark toggle */}
          <button
            id="toggle-watermark-btn"
            type="button"
            onClick={() => onChangeWatermarkSettings({
              ...watermarkSettings,
              enabled: !watermarkSettings.enabled,
            })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              watermarkSettings.enabled
                ? 'bg-rose-950/70 border-rose-600/60 text-rose-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {watermarkSettings.enabled ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5" />}
            <span>🚫 မူရင်းစာသားဖျောက်ရန်</span>
          </button>

          {/* Subtitle Styler Toggle */}
          <button
            id="toggle-subtitles-settings-btn"
            type="button"
            onClick={() => setShowSubSettings(!showSubSettings)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              showSubSettings
                ? 'bg-purple-900/80 border-fuchsia-500 text-purple-100'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>🔤 စာတန်းထိုးစတိုင်</span>
          </button>
        </div>
      </div>

      {/* Quick Settings Drawer if opened */}
      {showSubSettings && (
        <div className="p-4 rounded-xl bg-[#0d0e22] border border-purple-800/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-purple-200">
            <span>မြန်မာစာတန်းထိုး ပုံစံညှိရန် (Subtitle Customization)</span>
            <button
              onClick={() => setShowSubSettings(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Font Family */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">ဖောင့်စတိုင် (Font):</label>
              <select
                value={subtitleSettings.fontFamily}
                onChange={(e) => onChangeSubtitleSettings({
                  ...subtitleSettings,
                  fontFamily: e.target.value as any,
                })}
                className="w-full bg-[#080914] border border-purple-800/50 rounded-lg px-2.5 py-1.5 text-slate-200"
              >
                <option value="Noto Sans Myanmar">Noto Sans Myanmar</option>
                <option value="Padauk">Padauk (ပြေပြစ်သော)</option>
                <option value="system-ui">Modern Sans (ခေတ်မီ)</option>
              </select>
            </div>

            {/* Font Color */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">စာလုံးအရောင် (Color):</label>
              <div className="flex items-center gap-1.5">
                {[
                  { name: 'Yellow', color: '#FACC15' },
                  { name: 'White', color: '#FFFFFF' },
                  { name: 'Cyan', color: '#38BDF8' },
                  { name: 'Pink', color: '#F472B6' },
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => onChangeSubtitleSettings({ ...subtitleSettings, textColor: c.color })}
                    className={`w-6 h-6 rounded-full border transition ${
                      subtitleSettings.textColor === c.color ? 'ring-2 ring-fuchsia-500 scale-110' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">တည်နေရာ (Position):</label>
              <select
                value={subtitleSettings.position}
                onChange={(e) => onChangeSubtitleSettings({
                  ...subtitleSettings,
                  position: e.target.value as any,
                })}
                className="w-full bg-[#080914] border border-purple-800/50 rounded-lg px-2.5 py-1.5 text-slate-200"
              >
                <option value="bottom-safe">TikTok Safe Zone (အောက်နား အလယ်)</option>
                <option value="bottom">Bottom (အောက်ဆုံး)</option>
                <option value="center">Center (အလယ်တည့်တည့်)</option>
                <option value="top">Top (ထိပ်ပိုင်း)</option>
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                အရွယ်အစား ({subtitleSettings.fontSize}px):
              </label>
              <input
                type="range"
                min="14"
                max="28"
                step="1"
                value={subtitleSettings.fontSize}
                onChange={(e) => onChangeSubtitleSettings({
                  ...subtitleSettings,
                  fontSize: parseInt(e.target.value),
                })}
                className="w-full h-1.5 bg-slate-800 rounded accent-fuchsia-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Watermark Removal Controls (if enabled) */}
      {watermarkSettings.enabled && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-300 font-semibold">
            <EyeOff className="w-4 h-4 text-rose-400" />
            <span>မူရင်းစာသားဖျောက် အကွက် (Watermark / Subtitle Blur Mask): ဖွင့်ထားပါသည်</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">အမြင့် အကျယ်:</span>
              <input
                type="range"
                min="8"
                max="30"
                value={watermarkSettings.heightPercent}
                onChange={(e) => onChangeWatermarkSettings({
                  ...watermarkSettings,
                  heightPercent: parseInt(e.target.value),
                })}
                className="w-20 h-1 bg-slate-800 rounded accent-rose-500"
              />
              <span className="text-[10px] text-rose-300 font-mono">{watermarkSettings.heightPercent}%</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Blur အား:</span>
              <input
                type="range"
                min="4"
                max="25"
                value={watermarkSettings.blurAmount}
                onChange={(e) => onChangeWatermarkSettings({
                  ...watermarkSettings,
                  blurAmount: parseInt(e.target.value),
                })}
                className="w-20 h-1 bg-slate-800 rounded accent-rose-500"
              />
              <span className="text-[10px] text-rose-300 font-mono">{watermarkSettings.blurAmount}px</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Video Viewport Container */}
      <div
        ref={containerRef}
        className="relative mx-auto flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#070711] border border-purple-900/60 shadow-2xl"
        style={{
          width: '100%',
          maxWidth: aspectRatio === '9:16' ? '360px' : '720px',
          aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
          minHeight: aspectRatio === '9:16' ? '480px' : '320px',
        }}
      >
        {/* Video Element (if file uploaded) or Dynamic Simulated Cinema Canvas */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          /* High-aesthetic simulated cinematic movie backdrop */
          <div className="relative w-full h-full flex flex-col justify-between p-6 bg-gradient-to-b from-purple-950/80 via-[#0a081a] to-[#04040a] overflow-hidden">
            {/* Ambient movie visual effects */}
            <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-fuchsia-600/30 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-indigo-600/20 rounded-full blur-2xl" />
            </div>

            {/* Video overlay status bar (Clean, no branding watermark) */}
            <div className="relative z-10 flex items-center justify-end text-xs text-purple-200/80">
              <div className="flex items-center gap-1.5">
                {isPlaying && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[10px] animate-pulse">
                    <Volume2 className="w-3 h-3" />
                    <span>မြန်မာအသံ ထွက်နေပါသည်</span>
                  </div>
                )}
                <div className="px-2 py-0.5 rounded bg-black/40 text-[10px] text-fuchsia-300 font-mono border border-purple-900/40">
                  {aspectRatio === '9:16' ? '1080x1920 (9:16)' : '1920x1080 (16:9)'}
                </div>
              </div>
            </div>

            {/* Center Movie Poster / Visual Badge */}
            <div className="relative z-10 text-center space-y-2 my-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-2xl shadow-purple-900/60 flex items-center justify-center">
                <div className="w-full h-full rounded-2xl bg-[#0e0f24] flex items-center justify-center text-3xl sm:text-4xl">
                  🎬
                </div>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-100 line-clamp-1 px-4">
                {movieTitle || 'Movie Title Recap'}
              </h4>
              <p className="text-[11px] text-purple-300/80">
                {activeVoice.fullName} ({speed.toFixed(2)}x)
              </p>
            </div>
          </div>
        )}

        {/* Feature 5.1: Watermark / Original Text Removal Mask Overlay (Clean Blur/Gradient without placeholder text) */}
        {watermarkSettings.enabled && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none transition-all"
            style={{
              bottom: watermarkSettings.position === 'bottom' ? '12%' : 'auto',
              top: watermarkSettings.position === 'top' ? '8%' : 'auto',
              height: `${watermarkSettings.heightPercent}%`,
              backdropFilter: `blur(${watermarkSettings.blurAmount}px)`,
              WebkitBackdropFilter: `blur(${watermarkSettings.blurAmount}px)`,
              background: 'linear-gradient(180deg, rgba(10,10,20,0.5) 0%, rgba(10,10,20,0.92) 50%, rgba(10,10,20,0.5) 100%)',
            }}
          />
        )}

        {/* Feature 5.2: Auto Myanmar Subtitles Overlay (Compact, non-blocking, short line-by-line) */}
        <div
          className="absolute left-0 right-0 z-30 px-3 sm:px-6 text-center pointer-events-none transition-all duration-150 flex justify-center"
          style={{
            bottom:
              subtitleSettings.position === 'bottom-safe'
                ? '12%'
                : subtitleSettings.position === 'bottom'
                ? '5%'
                : subtitleSettings.position === 'center'
                ? '46%'
                : '84%',
          }}
        >
          {currentCue && currentCue.text ? (
            <div className="inline-flex max-w-[85%] sm:max-w-[78%] transition-transform transform duration-150 animate-in fade-in zoom-in-95">
              <span
                className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl font-bold leading-normal tracking-wide text-center"
                style={{
                  fontFamily: subtitleSettings.fontFamily,
                  fontSize: `${Math.min(22, subtitleSettings.fontSize)}px`,
                  color: subtitleSettings.textColor,
                  backgroundColor: 'rgba(6, 6, 16, 0.88)',
                  border: '1px solid rgba(217, 70, 239, 0.45)',
                  textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 2px #000',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
                  wordBreak: 'break-word',
                }}
              >
                {currentCue.text}
              </span>
            </div>
          ) : null}
        </div>

        {/* Play/Pause Center Overlay on hover or click */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-25 flex items-center justify-center bg-black/20 hover:bg-black/35 transition group"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 ${
            isPlaying
              ? 'bg-purple-900/40 text-purple-200 opacity-0 group-hover:opacity-100 scale-90'
              : 'bg-fuchsia-600/90 text-white shadow-xl shadow-fuchsia-950/60 scale-100 group-hover:scale-105'
          }`}>
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 translate-x-0.5 fill-current" />}
          </div>
        </button>

        {/* Video Bottom Progress & Control Bar */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Progress scrubber */}
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 mb-2"
          />

          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1 rounded text-white hover:text-fuchsia-400 transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                onClick={handleRestart}
                className="p-1 rounded text-slate-400 hover:text-white transition"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] text-slate-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-300/80 font-semibold px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                {activeVoice.fullName.split(' ')[0]} ({speed}x)
              </span>
              <button
                onClick={toggleFullscreen}
                className="p-1 text-slate-400 hover:text-white"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
