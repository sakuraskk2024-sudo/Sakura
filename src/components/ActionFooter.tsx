import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, PlayCircle, Film } from 'lucide-react';
import { copyToClipboard } from '../utils/subtitlesExport';

interface ActionFooterProps {
  isGenerating: boolean;
  onGenerate: () => void;
  fullScriptText: string;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({
  isGenerating,
  onGenerate,
  fullScriptText,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!fullScriptText) return;
    const ok = await copyToClipboard(fullScriptText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="sticky bottom-0 z-30 w-full p-4 sm:p-5 bg-gradient-to-r from-[#170e30]/95 via-[#1a0f3d]/95 to-[#240e3b]/95 backdrop-blur-md border-t border-purple-800/60 shadow-2xl shadow-black">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left note/status */}
        <div className="hidden md:flex items-center gap-2 text-xs text-purple-200/90 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Coin / API Key မလိုပါ · 100% Free · Sakura AI Recap Studio</span>
        </div>

        {/* Buttons Group */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Copy Button (Required) */}
          <button
            id="copy-script-btn"
            type="button"
            onClick={handleCopy}
            disabled={!fullScriptText || isGenerating}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all border ${
              copied
                ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                : 'bg-purple-950/80 hover:bg-purple-900 border-purple-700/60 text-purple-200 hover:text-white shadow-md shadow-purple-950/50 active:scale-95'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span>ကူးယူပြီးပါပြီ (Copied!)</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-pink-300" />
                <span>📋 စာသားများ ကူးယူရန် (Copy Text)</span>
              </>
            )}
          </button>

          {/* Large Main Button (Required: with purple background gradient and exact text) */}
          <button
            id="generate-recap-main-btn"
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="relative group overflow-hidden flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl font-extrabold text-sm sm:text-base text-white shadow-xl shadow-fuchsia-950/60 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:via-purple-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-wait"
          >
            {/* Shimmer animation light */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-fuchsia-200" />
                <span>ဖန်တီးနေပါသည်... (Generating...)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                <span>✨ ဇာတ်ညွှန်းနှင့် ဗီဒီယို စာတန်းထိုးရန် ဖန်တီးမည်</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
