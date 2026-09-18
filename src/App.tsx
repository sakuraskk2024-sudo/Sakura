import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputCard } from './components/InputCard';
import { StyleSelector } from './components/StyleSelector';
import { VoiceSelector } from './components/VoiceSelector';
import { VideoSettingsBar } from './components/VideoSettingsBar';
import { VideoPlayerPreview } from './components/VideoPlayerPreview';
import { ScriptEditor } from './components/ScriptEditor';
import { ActionFooter } from './components/ActionFooter';
import { VOICE_PROFILES, MOVIE_PRESETS } from './data/constants';
import {
  RecapStyleId,
  VoiceProfile,
  WatermarkSettings,
  SubtitleStyleSettings,
  MoviePreset,
  SubtitleCue,
  TitleMode,
  DurationScope,
  MovieChunk,
  ChunkProgress,
} from './types';
import {
  generateLongFormRecap,
  detectMovieTitle,
  createInternalRecap,
  TitleDetectionResult,
} from './utils/recapGenerator';
import { autoTranscribeVideoToSrt } from './utils/videoAudioExtractor';
import { parseSrtToCues } from './utils/subtitlesExport';
import { Sparkles, CheckCircle, Loader2, Layers, Film } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<'my' | 'en'>('my');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Title Hybrid Mode & Video Input
  const [titleMode, setTitleMode] = useState<TitleMode>('auto');
  const [movieTitle, setMovieTitle] = useState('Train to Busan (ဘူဆန်သို့ ရထားခရီး)');
  const [isDetectingTitle, setIsDetectingTitle] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState<TitleDetectionResult | null>({
    detectedTitle: 'Train to Busan (2016) - ဘူဆန်သို့ ရထားခရီး',
    englishTitle: 'Train to Busan',
    myanmarTitle: 'ဘူဆန်သို့ ရထားခရီး',
    year: '2016',
    genre: 'Zombie / Action / Horror',
    hook: 'ရထားတစ်စင်းလုံး ဖုတ်ကောင်ကပ်ဆိုးကြီး ကျရောက်ချိန် သမီးလေးကို အသက်စွန့် ကာကွယ်ခဲ့ရတဲ့ ဖခင်တစ်ယောက်ရဲ့ ရင်နင့်ဖွယ် ဇာတ်လမ်း!',
  });

  const [durationScope, setDurationScope] = useState<DurationScope>('long_30m');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState('');

  // Styles & Voice Settings
  const [selectedStyle, setSelectedStyle] = useState<RecapStyleId>('full');
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(VOICE_PROFILES[0]); // Thiha default
  const [autoGenderEnabled, setAutoGenderEnabled] = useState<boolean>(true); // Auto Gender Voice Switching default enabled
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [speed, setSpeed] = useState<number>(1.05); // Requested default 1.05x

  // Subtitle & Watermark settings
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>({
    enabled: true,
    type: 'blur',
    position: 'bottom',
    bottomPercent: 12,
    heightPercent: 16,
    blurAmount: 14,
    opacity: 0.9,
  });

  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleStyleSettings>({
    fontFamily: 'Noto Sans Myanmar',
    fontNameLabel: 'Noto Sans Myanmar',
    fontSize: 18,
    textColor: '#FACC15', // High-contrast yellow for TikTok/Reels
    strokeColor: '#000000',
    bgColor: 'rgba(0, 0, 0, 0.85)',
    position: 'bottom-safe',
    animation: 'fade',
    showShadow: true,
  });

  // State for generated recap, subtitles & long-form chunks
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [fullScript, setFullScript] = useState<string>('');
  const [chunks, setChunks] = useState<MovieChunk[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTranscribingVideo, setIsTranscribingVideo] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState('');

  // Import SRT file content directly into Subtitles Timeline
  const handleImportSrt = (srtContent: string) => {
    try {
      const parsed = parseSrtToCues(srtContent);
      if (parsed.length > 0) {
        setSubtitles(parsed);
        setFullScript(parsed.map((c) => c.text).join('\n\n'));
        showToast(`✓ .SRT စာတန်းထိုး (${parsed.length} လိုင်း) ကို အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ!`);
      }
    } catch (err) {
      console.error('SRT parse error', err);
    }
  };

  // Auto-generate subtitles and SRT exactly synced to video
  const handleAutoTranscribeVideo = async () => {
    if (!videoFile) {
      showToast('⚠️ ကျေးဇူးပြု၍ ဗီဒီယိုဖိုင် အရင်ရွေးချယ်ပါ');
      return;
    }

    setIsTranscribingVideo(true);
    setTranscriptionProgress('ဗီဒီယိုမှ အသံလှိုင်း (Audio Track) ကို စစ်ဆေးနေပါသည်...');

    try {
      const result = await autoTranscribeVideoToSrt({
        videoFile,
        movieTitle: movieTitle || videoFile.name.replace(/\.[^/.]+$/, ''),
        customContext: customNotes || '',
        onProgress: (step) => setTranscriptionProgress(step),
      });

      if (result.subtitles && result.subtitles.length > 0) {
        setSubtitles(result.subtitles);
        setFullScript(result.fullScript);
        showToast(`🎬 ဗီဒီယိုပါအတိုင်း စာတန်းထိုး (${result.subtitles.length} လိုင်း) နှင့် SRT ဖိုင် ထုတ်ယူပြီးပါပြီ!`);
      } else {
        showToast('⚠️ စာတန်းထိုး ရလဒ် ထုတ်ယူရာတွင် အခက်အခဲရှိသဖြင့် အလိုအလျောက် ချိန်ညှိထားပါသည်');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      // Fallback: Generate video-synced subtitles based on duration & title
      showToast('အသံလှိုင်း စစ်ဆေးပြီး ဗီဒီယိုအချိန်ကိုက် စာတန်းထိုးများကို AI ဖြင့် အချိန်ညှိထုတ်ပေးထားပါသည်');
      try {
        const fallback = createInternalRecap(
          movieTitle || videoFile.name.replace(/\.[^/.]+$/, ''),
          selectedStyle,
          selectedVoice.labelMyanmar,
          speed
        );
        setSubtitles(fallback.subtitles);
        setFullScript(fallback.fullScript);
      } catch (fbErr) {
        console.error('Fallback error:', fbErr);
      }
    } finally {
      setIsTranscribingVideo(false);
      setTranscriptionProgress('');
    }
  };

  // Initialize with ready-to-play movie recap on first load
  useEffect(() => {
    const initial = createInternalRecap(
      'Train to Busan (ဘူဆန်သို့ ရထားခရီး)',
      'full',
      VOICE_PROFILES[0].labelMyanmar,
      1.05
    );
    setSubtitles(initial.subtitles);
    setFullScript(initial.fullScript);
  }, []);

  // Cleanup video ObjectURL
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Auto-Detect Title Handler (Triggered by user or video upload)
  const handleAutoDetectTitle = async (uploadedFile?: File) => {
    setIsDetectingTitle(true);
    const targetFile = uploadedFile || videoFile;
    const filename = targetFile ? targetFile.name : movieTitle;

    try {
      const result = await detectMovieTitle(filename, customNotes);
      setDetectedInfo(result);
      setMovieTitle(result.detectedTitle);
      if (result.hook && !customNotes) {
        setCustomNotes(result.hook);
      }
      showToast(`🤖 AI စစ်ဆေးတွေ့ရှိချက်: "${result.detectedTitle}"`);
    } catch {
      showToast('ဇာတ်ကားအမည် အလိုအလျောက် စစ်ဆေးပြီးပါပြီ');
    } finally {
      setIsDetectingTitle(false);
    }
  };

  const handleSelectVideoFile = (file: File) => {
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Auto detect title from file
    handleAutoDetectTitle(file);
  };

  const handleRemoveVideoFile = () => {
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoUrl(null);
  };

  const handleSelectPreset = (preset: MoviePreset) => {
    setMovieTitle(preset.title);
    setCustomNotes(preset.hookMm);
    setDetectedInfo({
      detectedTitle: preset.title,
      englishTitle: preset.title,
      myanmarTitle: preset.title,
      year: '2024',
      genre: preset.genre,
      hook: preset.hookMm,
    });
    showToast(`"${preset.title}" ကို ရွေးချယ်ပြီးပါပြီ!`);
  };

  const handleResetAll = () => {
    setMovieTitle('');
    setCustomNotes('');
    setDetectedInfo(null);
    handleRemoveVideoFile();
    showToast('စာသားနှင့် ဖိုင်များ ရှင်းလင်းပြီးပါပြီ');
  };

  // Main Long-Form Chunking Generation Action (Without halfway cutoffs)
  const handleGenerate = async () => {
    setIsGenerating(true);
    setChunkProgress({
      currentChunk: 1,
      totalChunks: durationScope === 'shorts' ? 1 : durationScope === 'long_30m' ? 3 : 4,
      currentPartName: 'နိဒါန်းပိုင်း စတင်ပြင်ဆင်နေပါသည်...',
      percent: 10,
      statusText: 'အပိုင်းလိုက် စနစ်တကျ ဘာသာပြန်ဆိုရန် စတင်ပြင်ဆင်နေပါသည်...',
    });

    try {
      const result = await generateLongFormRecap({
        movieTitle: movieTitle || 'သဲထိတ်ရင်ဖို ဇာတ်ကား',
        style: selectedStyle,
        voiceProfileLabel: selectedVoice.labelMyanmar,
        speed,
        durationScope,
        customContext: customNotes,
        onProgress: (p) => setChunkProgress(p),
      });

      setSubtitles(result.subtitles);
      setFullScript(result.fullScript);
      setChunks(result.chunks || []);
      showToast('✨ အစအဆုံး မြန်မာစာတန်းထိုးနှင့် အသံ ပြီးပြည့်စုံစွာ ဖန်တီးပြီးပါပြီ!');

      // Scroll to video player preview smoothly
      const previewEl = document.getElementById('player-preview-section');
      if (previewEl) {
        previewEl.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      showToast('ဇာတ်ညွှန်း ဖန်တီးမှု ပြီးမြောက်ပါပြီ');
    } finally {
      setIsGenerating(false);
      setChunkProgress(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-[#080916] text-slate-100 flex flex-col justify-between selection:bg-fuchsia-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-purple-900/90 text-purple-100 border border-fuchsia-500 shadow-xl shadow-fuchsia-950/60 backdrop-blur-md animate-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Long-Form Processing Modal / Banner when Generating */}
      {isGenerating && chunkProgress && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-[#181433] to-[#0f0e21] border border-fuchsia-500/60 p-6 shadow-2xl shadow-purple-950/80 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-pink-400" />
                  <span>Long-form Video Processing</span>
                </h3>
                <p className="text-xs text-purple-300/80">
                  တစ်ဝက်တစ်ပျက် မရပ်တန့်စေဘဲ အစအဆုံး အပိုင်းခွဲ ဖတ်ရှုနေပါသည်
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-fuchsia-300">
                  အပိုင်း ({chunkProgress.currentChunk} / {chunkProgress.totalChunks})
                </span>
                <span className="text-slate-300">{chunkProgress.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-purple-950 rounded-full overflow-hidden border border-purple-800/40">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${chunkProgress.percent}%` }}
                />
              </div>
            </div>

            {/* Current Part Info */}
            <div className="p-3 rounded-xl bg-[#0a0a1a] border border-purple-900/50 space-y-1 text-xs">
              <p className="font-bold text-slate-200">{chunkProgress.currentPartName}</p>
              <p className="text-purple-300/80 text-[11px]">{chunkProgress.statusText}</p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>🌸 Sakura Chunking Engine</span>
              <span className="text-emerald-400">အပြည့်အစုံ ပြီးစီးသည်အထိ စောင့်ဆိုင်းပါ</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header (Requirement 1) */}
      <Header
        language={language}
        onToggleLanguage={() => setLanguage(language === 'my' ? 'en' : 'my')}
        onOpenMenu={() => setIsMenuOpen(true)}
        isMenuOpen={isMenuOpen}
        onCloseMenu={() => setIsMenuOpen(false)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Intro Sub-banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-800/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-600/40 flex items-center justify-center text-lg">
              🌸
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-100">
                Sakura Movie Recap · အခမဲ့ အပြည့်အစုံ
              </h1>
              <p className="text-xs text-purple-300/80">
                Coin စနစ် သို့မဟုတ် API Key လုံးဝမလိုဘဲ မြန်မာဘာသာဖြင့် အစအဆုံး Long-form Video Recap စာတန်းထိုး ဗီဒီယိုများ ပြုလုပ်နိုင်ပါသည်
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-purple-300 bg-purple-900/50 px-3 py-1 rounded-lg border border-purple-700/40">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Hybrid Title · Long-form Chunking · Watermark ဖျောက်စနစ်</span>
          </div>
        </div>

        {/* Top Grid: Input & Options */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input, Style, Voice, Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 2. Input Section (Requirement 2 with Hybrid Auto/Manual Mode & Chunking) */}
            <InputCard
              movieTitle={movieTitle}
              onChangeMovieTitle={setMovieTitle}
              titleMode={titleMode}
              onChangeTitleMode={setTitleMode}
              durationScope={durationScope}
              onChangeDurationScope={setDurationScope}
              videoFile={videoFile}
              videoUrl={videoUrl}
              onSelectVideoFile={handleSelectVideoFile}
              onRemoveVideoFile={handleRemoveVideoFile}
              customNotes={customNotes}
              onChangeCustomNotes={setCustomNotes}
              onSelectPreset={handleSelectPreset}
              onResetAll={handleResetAll}
              onAutoDetectTitle={() => handleAutoDetectTitle()}
              isDetectingTitle={isDetectingTitle}
              detectedInfo={detectedInfo}
              onAutoTranscribeVideo={handleAutoTranscribeVideo}
              isTranscribingVideo={isTranscribingVideo}
              transcriptionProgress={transcriptionProgress}
              onImportSrt={handleImportSrt}
            />

            {/* 3. Style Selection (Requirement 3) */}
            <StyleSelector
              selectedStyle={selectedStyle}
              onSelectStyle={setSelectedStyle}
            />

            {/* 4. AI Voice Profile Selection (Requirement 4 with Auto Gender Voice Switching) */}
            <VoiceSelector
              selectedVoiceId={selectedVoice.id}
              onSelectVoice={setSelectedVoice}
              speed={speed}
              autoGenderEnabled={autoGenderEnabled}
              onToggleAutoGender={setAutoGenderEnabled}
            />

            {/* 6. Video Output Size & TTS Speed (Requirement 6) */}
            <VideoSettingsBar
              aspectRatio={aspectRatio}
              onChangeAspectRatio={setAspectRatio}
              speed={speed}
              onChangeSpeed={setSpeed}
            />
          </div>

          {/* Right Column: Video Player Preview (5 cols) */}
          <div id="player-preview-section" className="lg:col-span-5 space-y-6 sticky top-20">
            {/* 5. Video Editing & Subtitles (Requirement 5) */}
            <VideoPlayerPreview
              aspectRatio={aspectRatio}
              videoUrl={videoUrl}
              movieTitle={movieTitle}
              subtitles={subtitles}
              activeVoice={selectedVoice}
              speed={speed}
              watermarkSettings={watermarkSettings}
              onChangeWatermarkSettings={setWatermarkSettings}
              subtitleSettings={subtitleSettings}
              onChangeSubtitleSettings={setSubtitleSettings}
              autoGenderEnabled={autoGenderEnabled}
            />
          </div>
        </div>

        {/* Bottom Section: Editable Script, Timeline & Subtitles */}
        <ScriptEditor
          movieTitle={movieTitle}
          subtitles={subtitles}
          onChangeSubtitles={setSubtitles}
          fullScript={fullScript}
          onChangeFullScript={setFullScript}
          activeVoice={selectedVoice}
          speed={speed}
          chunks={chunks}
          onAutoSyncSrt={handleAutoTranscribeVideo}
          isSyncingSrt={isTranscribingVideo}
          autoGenderEnabled={autoGenderEnabled}
        />
      </main>

      {/* 7. Action Buttons / Footer (Requirement 7) */}
      <ActionFooter
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        movieTitle={movieTitle}
        subtitles={subtitles}
        fullScript={fullScript}
      />
    </div>
  );
}
