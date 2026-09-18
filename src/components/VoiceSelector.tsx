import React, { useState } from 'react';
import { Mic, Volume2, VolumeX, Play, Square, Sparkles, User, Users } from 'lucide-react';
import { VoiceProfile } from '../types';
import { VOICE_PROFILES } from '../data/constants';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoice: (voice: VoiceProfile) => void;
  speed: number;
  autoGenderEnabled?: boolean;
  onToggleAutoGender?: (enabled: boolean) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onSelectVoice,
  speed,
  autoGenderEnabled = true,
  onToggleAutoGender,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const currentVoice = VOICE_PROFILES.find((v) => v.id === selectedVoiceId) || VOICE_PROFILES[0];

  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      audioSynthesizer.stop();
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      audioSynthesizer.playVoicePreview(currentVoice, speed, () => {
        setIsPlayingPreview(false);
      });
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = VOICE_PROFILES.find((v) => v.id === e.target.value);
    if (found) {
      if (isPlayingPreview) {
        audioSynthesizer.stop();
        setIsPlayingPreview(false);
      }
      onSelectVoice(found);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#141228] to-[#0f0e21] border border-purple-800/40 p-5 sm:p-6 shadow-xl shadow-purple-950/30">
      {/* Required Heading: Exact match */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-purple-900/30">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-fuchsia-400" />
          <h3 className="text-base sm:text-lg font-bold text-slate-100">
            🎙️ AI အသံ (Voice Profile) ရွေးချယ်ရန်
          </h3>
        </div>
        <span className="text-xs text-purple-300/80 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-800/40 self-start sm:self-auto">
          စစ်မှန်သော အသံ ၁၀ မျိုး (10 Voices)
        </span>
      </div>

      <div className="space-y-4">
        {/* Dropdown Container */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <select
              id="voice-profile-dropdown"
              value={selectedVoiceId}
              onChange={handleSelectChange}
              className="w-full bg-[#0b0c1c] border border-purple-700/60 text-slate-100 text-sm rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 cursor-pointer transition font-medium"
            >
              {VOICE_PROFILES.map((voice) => (
                <option
                  key={voice.id}
                  value={voice.id}
                  className="bg-[#0f1026] text-slate-200 py-2"
                >
                  {voice.labelMyanmar}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-purple-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Audition / Preview Button */}
          <button
            id="voice-preview-btn"
            type="button"
            onClick={handleTogglePreview}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-xs transition active:scale-95 shrink-0 ${
              isPlayingPreview
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50'
                : 'bg-purple-800 hover:bg-purple-700 text-purple-100 shadow-md shadow-purple-950/40 border border-purple-600/50'
            }`}
          >
            {isPlayingPreview ? (
              <>
                <Square className="w-4 h-4 fill-current animate-pulse" />
                <span>ရပ်တန့်မည် (Stop Sample)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-pink-300" />
                <span>🔊 အသံစမ်းသပ်ရန် (Audition)</span>
              </>
            )}
          </button>
        </div>

        {/* Active Voice Info Card */}
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
              currentVoice.gender === 'female'
                ? 'bg-pink-900/60 text-pink-300 border border-pink-700/50'
                : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
            }`}>
              {currentVoice.gender === 'female' ? 'မ' : 'ကျား'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">{currentVoice.fullName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900/50 text-purple-200 border border-purple-700/40">
                  {currentVoice.badge}
                </span>
              </div>
              <p className="text-xs text-purple-300/80 mt-0.5">
                {currentVoice.desc}
              </p>
            </div>
          </div>

          {isPlayingPreview && (
            <div className="flex items-center gap-1">
              <span className="w-1 h-4 bg-pink-400 animate-bounce rounded-full" />
              <span className="w-1 h-6 bg-purple-400 animate-bounce delay-75 rounded-full" />
              <span className="w-1 h-3 bg-indigo-400 animate-bounce delay-150 rounded-full" />
            </div>
          )}
        </div>

        {/* Feature: Auto Gender Voice Switching Setting Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-[#100f24] to-pink-950/30 border border-purple-800/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-fuchsia-950/80 border border-fuchsia-700/50 flex items-center justify-center text-fuchsia-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">
                  Auto Gender Voice Switching (ကျား/မ အသံ အလိုအလျောက်ပြောင်းစနစ်)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 font-medium">
                  {autoGenderEnabled ? 'ဖွင့်ထားသည်' : 'ပိတ်ထားသည်'}
                </span>
              </div>
              <p className="text-xs text-purple-300/80 mt-0.5">
                ဇာတ်လမ်းထဲတွင် အမျိုးသား/အမျိုးသမီး ဇာတ်ကောင် စကားပြောဆိုချက်များအလိုက် သင့်လျော်သော ကျား/မ AI အသံကို အလိုအလျောက် ရွေးချယ်ပြောင်းလဲပေးသည်
              </p>
            </div>
          </div>

          {onToggleAutoGender && (
            <button
              type="button"
              onClick={() => onToggleAutoGender(!autoGenderEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoGenderEnabled ? 'bg-fuchsia-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoGenderEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
