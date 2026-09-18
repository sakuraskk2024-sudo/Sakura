import React, { useState, useEffect } from 'react';
import { SubtitleCue, VoiceProfile, MovieChunk } from '../types';
import {
  Edit3,
  Plus,
  Trash2,
  Volume2,
  Download,
  Copy,
  Check,
  FileText,
  List,
  Sparkles,
  RefreshCw,
  Play,
  Square,
  Layers,
  FileCode,
} from 'lucide-react';
import { convertToSrt, convertToVtt, downloadFile, copyToClipboard, parseSrtToCues } from '../utils/subtitlesExport';
import { audioSynthesizer } from '../utils/audioSynthesizer';
import { formatSeconds, splitIntoShortSubtitlePhrases } from '../utils/recapGenerator';

interface ScriptEditorProps {
  movieTitle: string;
  subtitles: SubtitleCue[];
  onChangeSubtitles: (cues: SubtitleCue[]) => void;
  fullScript: string;
  onChangeFullScript: (text: string) => void;
  activeVoice: VoiceProfile;
  speed: number;
  chunks?: MovieChunk[];
  onAutoSyncSrt?: () => void;
  isSyncingSrt?: boolean;
  autoGenderEnabled?: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  movieTitle,
  subtitles,
  onChangeSubtitles,
  fullScript,
  onChangeFullScript,
  activeVoice,
  speed,
  chunks = [],
  onAutoSyncSrt,
  isSyncingSrt = false,
  autoGenderEnabled = true,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'raw' | 'srt'>('timeline');
  const [copied, setCopied] = useState(false);
  const [activePlayingId, setActivePlayingId] = useState<number | null>(null);
  const [isContinuousPlaying, setIsContinuousPlaying] = useState(false);
  const [activeContinuousCueId, setActiveContinuousCueId] = useState<number | null>(null);
  const [selectedChunkTab, setSelectedChunkTab] = useState<number | 'all'>('all');
  const [srtText, setSrtText] = useState<string>('');

  // Keep srtText synced when subtitles update
  useEffect(() => {
    setSrtText(convertToSrt(subtitles));
  }, [subtitles]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      audioSynthesizer.stop();
    };
  }, []);

  // Update a specific subtitle line
  const handleUpdateText = (id: number, text: string) => {
    const updated = subtitles.map((cue) => (cue.id === id ? { ...cue, text } : cue));
    onChangeSubtitles(updated);
    onChangeFullScript(updated.map((c) => c.text).join('\n\n'));
  };

  // Update timestamps
  const handleUpdateTimestamp = (id: number, field: 'startTime' | 'endTime', value: number) => {
    const updated = subtitles.map((cue) => {
      if (cue.id === id) {
        const nextStart = field === 'startTime' ? value : cue.startTime;
        const nextEnd = field === 'endTime' ? value : cue.endTime;
        return {
          ...cue,
          startTime: nextStart,
          endTime: nextEnd,
          startDisplay: formatSeconds(nextStart),
          endDisplay: formatSeconds(nextEnd),
        };
      }
      return cue;
    });
    onChangeSubtitles(updated);
  };

  // Add new subtitle cue
  const handleAddCue = () => {
    const last = subtitles[subtitles.length - 1];
    const newStart = last ? last.endTime : 0;
    const newEnd = newStart + 5;
    const newCue: SubtitleCue = {
      id: Date.now(),
      startTime: newStart,
      endTime: newEnd,
      startDisplay: formatSeconds(newStart),
      endDisplay: formatSeconds(newEnd),
      text: 'စာသားအသစ် ထည့်သွင်းပါ...',
    };
    const updated = [...subtitles, newCue];
    onChangeSubtitles(updated);
    onChangeFullScript(updated.map((c) => c.text).join('\n\n'));
  };

  // Delete a subtitle cue
  const handleDeleteCue = (id: number) => {
    const updated = subtitles.filter((cue) => cue.id !== id);
    onChangeSubtitles(updated);
    onChangeFullScript(updated.map((c) => c.text).join('\n\n'));
  };

  // Play single line speech
  const handlePlayLine = (cue: SubtitleCue) => {
    if (isContinuousPlaying) {
      handleStopAllVoice();
    }
    if (activePlayingId === cue.id) {
      audioSynthesizer.stop();
      setActivePlayingId(null);
    } else {
      setActivePlayingId(cue.id);
      audioSynthesizer.speakNarration(
        cue.text,
        activeVoice,
        speed,
        undefined,
        () => {
          setActivePlayingId(null);
        },
        cue,
        autoGenderEnabled
      );
    }
  };

  // Play continuous narration for full long-form recap
  const handleStartContinuousVoice = () => {
    if (subtitles.length === 0) return;
    setIsContinuousPlaying(true);
    setActivePlayingId(null);

    const cuesToPlay =
      selectedChunkTab === 'all'
        ? subtitles
        : chunks.find((c) => c.chunkIndex === selectedChunkTab)?.subtitles || subtitles;

    audioSynthesizer.playContinuousPlaylist(
      cuesToPlay,
      activeVoice,
      speed,
      0,
      (_idx, cue) => {
        setActiveContinuousCueId(cue.id);
      },
      () => {
        setIsContinuousPlaying(false);
        setActiveContinuousCueId(null);
      },
      autoGenderEnabled
    );
  };

  const handleStopAllVoice = () => {
    audioSynthesizer.stop();
    setIsContinuousPlaying(false);
    setActiveContinuousCueId(null);
    setActivePlayingId(null);
  };

  // Toggle speaker gender manually for a cue
  const handleToggleCueGender = (id: number) => {
    const updated = subtitles.map((c) => {
      if (c.id === id) {
        const nextGender: 'male' | 'female' | 'auto' =
          c.speakerGender === 'male' ? 'female' : c.speakerGender === 'female' ? 'auto' : 'male';
        return { ...c, speakerGender: nextGender };
      }
      return c;
    });
    onChangeSubtitles(updated);
  };

  // Re-segment full script into short, crisp, line-by-line subtitle cues
  const handleRawToCues = () => {
    const lines = fullScript
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('【') && !l.endsWith('】'));

    const allShortPhrases: string[] = [];
    for (const line of lines) {
      const phrases = splitIntoShortSubtitlePhrases(line, 28);
      allShortPhrases.push(...phrases);
    }

    let sec = 0;
    const newCues: SubtitleCue[] = allShortPhrases.map((phrase, idx) => {
      const dur = Math.max(2.8, Math.min(6.5, phrase.length / 8));
      const start = Math.round(sec * 10) / 10;
      const end = Math.round((sec + dur) * 10) / 10;
      sec = end;
      return {
        id: idx + 1,
        startTime: start,
        endTime: end,
        startDisplay: formatSeconds(start),
        endDisplay: formatSeconds(end),
        text: phrase,
        speakerGender: 'auto',
      };
    });

    onChangeSubtitles(newCues);
    setViewMode('timeline');
  };

  const handleCopyAll = async () => {
    const textToCopy = subtitles.map((c) => `[${c.startDisplay} - ${c.endDisplay}]\n${c.text}`).join('\n\n');
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadSrt = () => {
    const srt = convertToSrt(subtitles);
    downloadFile(srt, `${movieTitle || 'SakuraRecap'}_Myanmar_Subtitles.srt`);
  };

  const handleDownloadVtt = () => {
    const vtt = convertToVtt(subtitles);
    downloadFile(vtt, `${movieTitle || 'SakuraRecap'}_Myanmar_Subtitles.vtt`);
  };

  const handleDownloadTxt = () => {
    const txt = `${movieTitle || 'Sakura Movie Recap'}\n\n${fullScript}`;
    downloadFile(txt, `${movieTitle || 'SakuraRecap'}_Script.txt`);
  };

  // Filter visible cues if a specific chunk tab is selected
  const displayedSubtitles =
    selectedChunkTab === 'all'
      ? subtitles
      : chunks.find((c) => c.chunkIndex === selectedChunkTab)?.subtitles || subtitles;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#141228] to-[#0f0e21] border border-purple-800/40 p-5 sm:p-6 shadow-xl shadow-purple-950/30 space-y-4">
      {/* Header & Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/30">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-fuchsia-400" />
            <span>ဇာတ်ညွှန်းနှင့် စာတန်းထိုး တည်းဖြတ်ခန်း (Editable Script & Subtitles)</span>
          </h3>
          <p className="text-xs text-purple-300/80 mt-0.5">
            အစအဆုံး ဘာသာပြန်ထားသော စာတန်းထိုးများနှင့် မြန်မာအသံ (TTS) ကို အပိုင်းလိုက် စစ်ဆေးနိုင်ပါသည်
          </p>
        </div>

        {/* View Toggle (Timeline Cues vs Raw Text vs SRT) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#0b0c1c] rounded-lg p-0.5 border border-purple-900/50">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'timeline'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>အချိန်ကိုက် စာတန်းထိုး (Timeline)</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'raw'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>စာသားအပြည့်အစုံ (Raw Script)</span>
            </button>
            <button
              onClick={() => setViewMode('srt')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'srt'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>🎬 .SRT ဖိုင် (SRT Preview)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chunk Tabs if multi-chunk long form is generated */}
      {chunks && chunks.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-purple-900/30">
          <div className="flex items-center gap-1 text-xs font-bold text-purple-300 pr-2 shrink-0">
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span>အပိုင်းများ:</span>
          </div>

          <button
            onClick={() => setSelectedChunkTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
              selectedChunkTab === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-950/40 text-slate-300 hover:bg-purple-900/50'
            }`}
          >
            အားလုံး (All: {subtitles.length} လိုင်း)
          </button>

          {chunks.map((c) => (
            <button
              key={c.chunkIndex}
              onClick={() => setSelectedChunkTab(c.chunkIndex)}
              className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                selectedChunkTab === c.chunkIndex
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-sm'
                  : 'bg-purple-950/40 text-slate-300 hover:bg-purple-900/50 border border-purple-800/30'
              }`}
            >
              <span>အပိုင်း ({c.chunkIndex})</span>
              <span className="text-[10px] text-purple-200 opacity-80">{c.timeRange}</span>
            </button>
          ))}
        </div>
      )}

      {/* Action Bar: Continuous Voiceover + Export Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[#0b0c1c] border border-purple-800/30">
        <div className="flex items-center gap-2">
          {isContinuousPlaying ? (
            <button
              id="stop-continuous-voice"
              onClick={handleStopAllVoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition active:scale-95 animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>အသံရပ်တန့်မည် (Stop Continuous Voice)</span>
            </button>
          ) : (
            <button
              id="play-continuous-voice"
              onClick={handleStartContinuousVoice}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>▶ အစအဆုံး ဆက်တိုက်နားဆင်မည် (Continuous TTS)</span>
            </button>
          )}

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            စာတန်းထိုး စုစုပေါင်း: <strong className="text-purple-300">{subtitles.length}</strong> ကြောင်း
          </span>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {onAutoSyncSrt && (
            <button
              onClick={onAutoSyncSrt}
              disabled={isSyncingSrt}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-800/60 hover:bg-purple-700 text-purple-200 hover:text-white text-xs border border-purple-600/50 transition active:scale-95 disabled:opacity-50"
              title="Auto sync subtitles and SRT according to video"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>{isSyncingSrt ? 'ညှိနေဆဲ...' : '⚡ ဗီဒီယိုအတိုင်း SRT ညှိမည်'}</span>
            </button>
          )}

          <button
            id="download-srt-btn"
            onClick={handleDownloadSrt}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95"
            title="Download SRT Subtitle file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📥 .SRT ဒေါင်းလုဒ်</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-950/60 hover:bg-purple-900/60 text-slate-300 hover:text-white text-xs border border-purple-800/40 transition"
            title="Copy script"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'ကူးယူပြီး' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadVtt}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-900/50 hover:bg-purple-800 text-purple-200 hover:text-white text-xs border border-purple-700/50 transition font-medium"
            title="Download VTT file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.VTT</span>
          </button>

          <button
            onClick={handleDownloadTxt}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-900/50 hover:bg-purple-800 text-purple-200 hover:text-white text-xs border border-purple-700/50 transition font-medium"
            title="Download text script"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>.TXT</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Timeline Subtitles Editor */}
      {viewMode === 'timeline' && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {displayedSubtitles.map((cue, index) => {
            const isSinglePlaying = activePlayingId === cue.id;
            const isContinuousActive = activeContinuousCueId === cue.id;
            const isHighlight = isSinglePlaying || isContinuousActive;

            return (
              <div
                key={cue.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isHighlight
                    ? 'bg-fuchsia-950/40 border-fuchsia-500 shadow-md shadow-fuchsia-950/40'
                    : 'bg-[#0a0a1a] border-purple-900/40 hover:border-purple-700/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-pink-400 bg-pink-950/60 px-2 py-0.5 rounded border border-pink-900/50">
                      #{index + 1}
                    </span>

                    {/* Time Input Boxes */}
                    <div className="flex items-center gap-1 text-xs text-slate-300">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={cue.startTime}
                        onChange={(e) => handleUpdateTimestamp(cue.id, 'startTime', parseFloat(e.target.value) || 0)}
                        className="w-14 bg-[#14122d] border border-purple-800/60 rounded px-1.5 py-0.5 text-center text-xs text-purple-200 focus:outline-none focus:border-fuchsia-500"
                      />
                      <span>➔</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={cue.endTime}
                        onChange={(e) => handleUpdateTimestamp(cue.id, 'endTime', parseFloat(e.target.value) || 0)}
                        className="w-14 bg-[#14122d] border border-purple-800/60 rounded px-1.5 py-0.5 text-center text-xs text-purple-200 focus:outline-none focus:border-fuchsia-500"
                      />
                      <span className="text-[11px] text-slate-500">
                        ({cue.startDisplay} - {cue.endDisplay})
                      </span>
                    </div>
                    {/* Speaker Gender Badge / Auto Switcher */}
                    <button
                      type="button"
                      onClick={() => handleToggleCueGender(cue.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                        cue.speakerGender === 'female'
                          ? 'bg-pink-950/80 border-pink-700/60 text-pink-300'
                          : cue.speakerGender === 'male'
                          ? 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300'
                          : 'bg-purple-950/60 border-purple-800/40 text-purple-300/80'
                      }`}
                      title="Click to toggle speaker voice: Male / Female / Auto"
                    >
                      {cue.speakerGender === 'female'
                        ? '👩 အမျိုးသမီးအသံ'
                        : cue.speakerGender === 'male'
                        ? '👨 အမျိုးသားအသံ'
                        : '⚡ Auto ကျား/မ'}
                    </button>
                  </div>

                  {/* Actions for this cue */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePlayLine(cue)}
                      className={`p-1.5 rounded-lg transition ${
                        isHighlight
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-800/40'
                      }`}
                      title="Play this single line"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    {subtitles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCue(cue.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title="Delete line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Editable Myanmar Subtitle Textarea */}
                <textarea
                  value={cue.text}
                  onChange={(e) => handleUpdateText(cue.id, e.target.value)}
                  rows={2}
                  className="w-full bg-[#070714] border border-purple-900/40 focus:border-fuchsia-500 rounded-lg p-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/20 resize-y leading-relaxed font-sans"
                  placeholder="မြန်မာစာတန်းထိုး စာသားကို ဤနေရာတွင် ပြင်ဆင်ပါ..."
                />
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddCue}
            className="w-full py-2.5 rounded-xl border border-dashed border-purple-700/60 hover:border-fuchsia-500 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>စာတန်းထိုး အသစ်ထပ်ထည့်ရန် (Add Subtitle Line)</span>
          </button>
        </div>
      )}

      {/* Mode 2: Raw Full-text Editor */}
      {viewMode === 'raw' && (
        <div className="space-y-3">
          <textarea
            value={fullScript}
            onChange={(e) => onChangeFullScript(e.target.value)}
            rows={10}
            className="w-full bg-[#080916] border border-purple-800/50 rounded-xl p-4 text-xs sm:text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 resize-y"
            placeholder="ဇာတ်ညွှန်းစာသားအပြည့်အစုံကို လွတ်လပ်စွာ ရေးသား/ပြင်ဆင်နိုင်ပါသည်..."
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              စာပိုဒ်တစ်ခုစီကို Enter ခေါက်ပြီး ခွဲခြားနိုင်ပါသည်
            </span>
            <button
              type="button"
              onClick={handleRawToCues}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>စာတန်းထိုးများအဖြစ် အလိုအလျောက် ပြန်ခွဲမည် (Re-Segment)</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: SRT Format Preview & Direct Editor */}
      {viewMode === 'srt' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs">
            <div className="text-emerald-200">
              <span className="font-semibold text-emerald-300">✓ စံမီ Standard SRT (SubRip) ဖိုင်ပုံစံ:</span>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                CapCut, Adobe Premiere, DaVinci Resolve နှင့် မည်သည့် Video Player တွင်မဆို တိုက်ရိုက်ထည့်သွင်းနိုင်ပါသည်
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSrt}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.SRT ဖိုင် ဒေါင်းလုဒ်</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(srtText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 transition active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'ကူးယူပြီး' : 'SRT ကူးယူမည်'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={srtText}
            onChange={(e) => setSrtText(e.target.value)}
            rows={12}
            className="w-full bg-[#050612] border border-purple-800/60 rounded-xl p-4 font-mono text-xs sm:text-sm text-emerald-300 leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-y"
            placeholder="1&#10;00:00:01,000 --> 00:00:04,500&#10;မြန်မာ စာတန်းထိုး..."
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              အချိန်နံပါတ် (00:00:00,000) သို့မဟုတ် မြန်မာစာသားများကို ပြင်ဆင်ပြီးပါက အောက်ပါခလုတ်ကို နှိပ်ပါ
            </span>
            <button
              type="button"
              onClick={() => {
                const parsed = parseSrtToCues(srtText);
                if (parsed.length > 0) {
                  onChangeSubtitles(parsed);
                  onChangeFullScript(parsed.map((c) => c.text).join('\n\n'));
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold transition"
            >
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>SRT ပြင်ဆင်ချက်များကို Subtitles တွင် အတည်ပြုသိမ်းမည်</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
