import React from 'react';
import { Sparkles, Flame, BookOpen, Zap, Check } from 'lucide-react';
import { RecapStyleId } from '../types';
import { RECAP_STYLES } from '../data/constants';

interface StyleSelectorProps {
  selectedStyle: RecapStyleId;
  onSelectStyle: (style: RecapStyleId) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyle,
  onSelectStyle,
}) => {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#141228] to-[#0f0e21] border border-purple-800/40 p-5 sm:p-6 shadow-xl shadow-purple-950/30">
      {/* Required Section Heading */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-900/30">
        <Sparkles className="w-5 h-5 text-fuchsia-400" />
        <h3 className="text-base sm:text-lg font-bold text-slate-100">
          ✨ Recap စတိုင် ရွေးချယ်ရန်
        </h3>
      </div>

      {/* 3 Choices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {RECAP_STYLES.map((style) => {
          const isSelected = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              id={`style-${style.id}`}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className={`relative text-left p-4 rounded-xl border transition-all duration-200 group flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-900/40 border-fuchsia-500 shadow-lg shadow-fuchsia-950/50 ring-1 ring-fuchsia-500/50'
                  : 'bg-[#0c0d1e]/80 border-purple-900/50 hover:border-purple-700/60 hover:bg-purple-950/20'
              }`}
            >
              {/* Badge & Check Indicator */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isSelected
                    ? 'bg-fuchsia-950/70 border-fuchsia-600/60 text-fuchsia-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400'
                }`}>
                  {style.badge}
                </span>

                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                  isSelected
                    ? 'bg-fuchsia-500 text-white scale-100'
                    : 'border border-slate-700 text-transparent scale-90'
                }`}>
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              {/* Title & Description matching prompt */}
              <div>
                <h4 className="text-sm font-bold text-slate-100 group-hover:text-purple-200 transition">
                  {style.title}
                </h4>
                <p className="text-xs text-purple-300/80 mt-1.5 leading-relaxed">
                  {style.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
