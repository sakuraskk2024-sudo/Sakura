import React from 'react';
import { Smartphone, Monitor, Gauge, RotateCcw } from 'lucide-react';

interface VideoSettingsBarProps {
  aspectRatio: '9:16' | '16:9';
  onChangeAspectRatio: (ratio: '9:16' | '16:9') => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
}

export const VideoSettingsBar: React.FC<VideoSettingsBarProps> = ({
  aspectRatio,
  onChangeAspectRatio,
  speed,
  onChangeSpeed,
}) => {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#141228] to-[#0f0e21] border border-purple-800/40 p-5 sm:p-6 shadow-xl shadow-purple-950/30 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Requirement 6.1: Output Size (9:16 default as TikTok / Reels / Shorts) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>📱</span>
              <span>ထွက်မည့် ပုံစံ (Output Size):</span>
            </label>
            <span className="text-[11px] font-semibold text-fuchsia-300 bg-fuchsia-950/60 px-2 py-0.5 rounded-full border border-fuchsia-800/40">
              {aspectRatio === '9:16' ? 'TikTok · Reels · Shorts' : 'YouTube · Cinema'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="ratio-9-16-btn"
              type="button"
              onClick={() => onChangeAspectRatio('9:16')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition text-left ${
                aspectRatio === '9:16'
                  ? 'bg-purple-900/40 border-fuchsia-500 shadow-md shadow-fuchsia-950/40 text-slate-100 ring-1 ring-fuchsia-500/40'
                  : 'bg-[#0c0d1e] border-purple-900/50 text-slate-400 hover:text-slate-200 hover:border-purple-700/50'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${aspectRatio === '9:16' ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">TikTok / Reels / Shorts (9:16)</p>
                <p className="text-[10px] text-purple-300/70 mt-0.5">1080x1920 (ဒေါင်လိုက်)</p>
              </div>
            </button>

            <button
              id="ratio-16-9-btn"
              type="button"
              onClick={() => onChangeAspectRatio('16:9')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition text-left ${
                aspectRatio === '16:9'
                  ? 'bg-purple-900/40 border-fuchsia-500 shadow-md shadow-fuchsia-950/40 text-slate-100 ring-1 ring-fuchsia-500/40'
                  : 'bg-[#0c0d1e] border-purple-900/50 text-slate-400 hover:text-slate-200 hover:border-purple-700/50'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${aspectRatio === '16:9' ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">YouTube / Cinema (16:9)</p>
                <p className="text-[10px] text-purple-300/70 mt-0.5">1920x1080 (အလျားလိုက်)</p>
              </div>
            </button>
          </div>
        </div>

        {/* Requirement 6.2: TTS Speed Slider Bar with exact 1.05x preset */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>⚡</span>
              <span>အသံထွက်အမြန်နှုန်း (TTS Speed):</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-fuchsia-300 bg-purple-950 px-2 py-0.5 rounded-md border border-purple-800/60">
                {speed.toFixed(2)}x
              </span>
              {speed !== 1.05 && (
                <button
                  type="button"
                  onClick={() => onChangeSpeed(1.05)}
                  className="text-[10px] text-slate-400 hover:text-pink-300 flex items-center gap-1 transition"
                  title="Reset to recommended 1.05x"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>1.05x သို့</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-2">
            <div className="relative flex items-center">
              <input
                id="tts-speed-slider"
                type="range"
                min="0.75"
                max="1.50"
                step="0.05"
                value={speed}
                onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
              />
            </div>
            
            {/* Speed Markers */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 px-1">
              <span>0.75x (အေးအေးလူလူ)</span>
              <button
                type="button"
                onClick={() => onChangeSpeed(1.0)}
                className={`hover:text-purple-300 ${speed === 1.0 ? 'text-fuchsia-400 font-bold' : ''}`}
              >
                1.00x
              </button>
              <button
                type="button"
                onClick={() => onChangeSpeed(1.05)}
                className={`hover:text-purple-300 px-1.5 py-0.5 rounded ${speed === 1.05 ? 'bg-fuchsia-900/60 text-fuchsia-300 font-bold border border-fuchsia-700/50' : ''}`}
              >
                1.05x (အကောင်းဆုံး)
              </button>
              <button
                type="button"
                onClick={() => onChangeSpeed(1.25)}
                className={`hover:text-purple-300 ${speed === 1.25 ? 'text-fuchsia-400 font-bold' : ''}`}
              >
                1.25x
              </button>
              <span>1.50x (အမြန်)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
