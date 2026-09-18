import { VoiceProfile, SubtitleCue } from '../types';
import { VOICE_PROFILES } from '../data/constants';

class VoiceSynthesizer {
  private audioCtx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isContinuousPlaying = false;
  private playlistCues: SubtitleCue[] = [];
  private playlistIndex = 0;
  private audioCache = new Map<string, string>();
  private preloadedAudios = new Map<number, HTMLAudioElement>();

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Detect gender from cue attributes or textual context
  public detectGenderForCue(cue: SubtitleCue, defaultVoice: VoiceProfile): 'male' | 'female' {
    if (cue.speakerGender === 'male') return 'male';
    if (cue.speakerGender === 'female') return 'female';

    const text = cue.text || '';

    // Female markers in Myanmar dialogue/grammar
    const femaleIndicators = [
      'ရှင်', 'ရှင့်', 'ကျွန်မ', 'မမ', 'သမီး', 'အမေ', 'ညီမ', 'ကောင်မလေး',
      'မေမေ', 'အစ်မ', 'မိန်းကလေး', 'အန်တီ', 'ဒေါ်ဒေါ်', 'ဆူအန်', 'ရို့စ်',
      'နီလာ', 'နှင်းဝတ်ရည်', 'သဇင်', 'စုမွန်', 'မေမြတ်'
    ];

    // Male markers in Myanmar dialogue/grammar
    const maleIndicators = [
      'ကျွန်တော်', 'ခင်ဗျာ', 'ကိုကို', 'အစ်ကို', 'သား', 'အဖေ', 'ညီလေး', 'ကောင်လေး',
      'ဖေဖေ', 'ဆော့ဝူး', 'ဂျက်', 'သီဟ', 'မင်းသန့်', 'ကျော်စွာ', 'နေလင်း', 'အာကာ'
    ];

    for (const word of femaleIndicators) {
      if (text.includes(word)) return 'female';
    }
    for (const word of maleIndicators) {
      if (text.includes(word)) return 'male';
    }

    // Default to the chosen voice's gender
    return defaultVoice.gender;
  }

  // Get matching voice for gender (keeping user's selection preferences)
  public getVoiceForCue(cue: SubtitleCue, baseVoice: VoiceProfile, autoGenderEnabled: boolean = true): VoiceProfile {
    if (!autoGenderEnabled) return baseVoice;

    const targetGender = this.detectGenderForCue(cue, baseVoice);
    if (baseVoice.gender === targetGender) {
      return baseVoice;
    }

    // Pick top matching voice of the target gender
    const matched = VOICE_PROFILES.find((v) => v.gender === targetGender);
    return matched || baseVoice;
  }

  // Pre-load audio for a cue to guarantee instantaneous zero-latency playback
  public preloadCueAudio(cue: SubtitleCue, voice?: VoiceProfile, autoGender: boolean = true) {
    if (!cue || !cue.text) return;
    const resolvedVoice = voice ? this.getVoiceForCue(cue, voice, autoGender) : undefined;
    const genderParam = resolvedVoice ? `&gender=${resolvedVoice.gender}&voice=${resolvedVoice.id}` : '';
    const url = `/api/tts?text=${encodeURIComponent(cue.text.slice(0, 200))}${genderParam}`;
    if (!this.preloadedAudios.has(cue.id)) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      this.preloadedAudios.set(cue.id, audio);
    }
  }

  // Play a voice sample preview with real Myanmar native audio
  public playVoicePreview(voice: VoiceProfile, speed: number = 1.05, onEnd?: () => void) {
    this.stop();

    const samplePhrases: Record<string, string> = {
      thiha: 'မင်္ဂလာပါ! ကျွန်တော် သီဟ ပါ။ သြဇာပြည့်ဝပြီး တည်ငြိမ်တဲ့ ဇာတ်ကြောင်းပြန်ပြောပြချက်တွေကို တင်ဆက်ပေးသွားမှာပါ။',
      nilar: 'မင်္ဂလာပါရှင်! ကျွန်မကတော့ နီလာ ပါ။ အေးချမ်းပြီး နားထောင်လို့ကောင်းတဲ့ အသံနဲ့ ဇာတ်လမ်းကို ဖမ်းစားပါရစေ။',
      min_thant: 'အားလုံးပဲ မင်္ဂလာပါ! ကျွန်တော် မင်းသန့် ပါ။ တက်ကြွစွမ်းအားပြည့်တဲ့ အက်ရှင်ဇာတ်ကားတွေကို အကောင်းဆုံး ပြောပြပါမယ်။',
      hnin_wutt_yi: 'မင်္ဂလာပါရှင်! နှင်းဝတ်ရည် ပါ။ ချိုသာကြည်လင်တဲ့ အသံလေးနဲ့အတူ ဇာတ်လမ်းကို သဘောကျစေရပါမယ်နော်။',
      kyaw_swar: 'မင်္ဂလာပါ! ကျော်စွာ ပါ။ ရင်ခုန်သံမြန်စေမယ့် သဲထိတ်ရင်ဖို ဇာတ်လမ်းတွေအတွက် အသင့်ပါပဲ။',
      thazin: 'မင်္ဂလာပါရှင့်! သဇင် ပါ။ စူးရှတက်ကြွတဲ့ အသံစတိုင်နဲ့ စက္ကန့်တိုင်းကို ဆွဲဆောင်သွားမှာပါ။',
      nay_lin: 'မင်္ဂလာပါ! ကျွန်တော် နေလင်း ပါ။ ပုံမှန်ခပ်တည်တည် လေးနက်တဲ့ မှတ်တမ်းရုပ်ရှင်စတိုင် အသံပါ။',
      su_mon: 'မင်္ဂလာပါရှင်! စုမွန် ပါ။ နုနယ်နားဝင်ချိုတဲ့ စကားသံလေးနဲ့ ရင်ထဲထိစေမယ့် ဇာတ်လမ်းတွေ တင်ဆက်ပါ့မယ်။',
      arkar: 'မင်္ဂလာပါ! အာကာ ပါ။ ခပ်ထူထူ အားမာန်ပါတဲ့ ဘေ့စ်သံနဲ့ ဇာတ်ရှိန်အပြည့် တင်ဆက်ပေးမှာပါ။',
      may_myat: 'မင်္ဂလာပါရှင်! မေမြတ် ပါ။ ဇာတ်ကောင်တိုင်းရဲ့ ခံစားချက်ကို ပီပြင်စွာ သရုပ်ဖော်ပြောပြပေးသွားပါမယ်။',
    };

    const textToSpeak = samplePhrases[voice.id] || `${voice.fullName} AI အသံဖြင့် စမ်းသပ်ပြောဆိုနေပါသည်`;

    // 1. Play subtle cinematic radio chime
    this.playChime(voice.frequency);

    // 2. Play native Myanmar audio from server TTS endpoint
    const url = `/api/tts?text=${encodeURIComponent(textToSpeak)}`;
    const audio = new Audio(url);
    this.currentAudio = audio;
    audio.playbackRate = Math.max(0.7, Math.min(1.8, speed * voice.rateModifier));

    audio.onended = () => {
      this.currentAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      // Fallback to speech synthesis if browser or network fails
      this.fallbackSpeechSynthesis(textToSpeak, voice, speed, onEnd);
    };

    audio.play().catch(() => {
      this.fallbackSpeechSynthesis(textToSpeak, voice, speed, onEnd);
    });
  }

  // Speak a specific narration subtitle line with optional auto gender switching
  public speakNarration(
    text: string,
    voice: VoiceProfile,
    speed: number,
    onBoundary?: (charIndex: number) => void,
    onEnd?: () => void,
    cue?: SubtitleCue,
    autoGenderEnabled: boolean = true
  ) {
    this.stop();
    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    const cleanText = text.trim();
    // Dynamically resolve voice if auto gender is enabled
    const actualVoice = cue
      ? this.getVoiceForCue(cue, voice, autoGenderEnabled)
      : this.getVoiceForCue({ id: 0, startTime: 0, endTime: 0, startDisplay: '', endDisplay: '', text: cleanText }, voice, autoGenderEnabled);

    const genderParam = `&gender=${actualVoice.gender}&voice=${actualVoice.id}`;
    const url = `/api/tts?text=${encodeURIComponent(cleanText)}${genderParam}`;
    const audio = new Audio(url);
    this.currentAudio = audio;
    audio.playbackRate = Math.max(0.7, Math.min(1.8, speed * actualVoice.rateModifier));

    audio.onended = () => {
      this.currentAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      this.fallbackSpeechSynthesis(cleanText, actualVoice, speed, onEnd);
    };

    audio.play().catch(() => {
      this.fallbackSpeechSynthesis(cleanText, actualVoice, speed, onEnd);
    });
  }

  // Continuous chunked playlist narration (Long-form Video Processing with Auto Gender Switching)
  public playContinuousPlaylist(
    cues: SubtitleCue[],
    voice: VoiceProfile,
    speed: number,
    startIndex: number = 0,
    onCueChange?: (cueIndex: number, cue: SubtitleCue, currentVoice: VoiceProfile) => void,
    onComplete?: () => void,
    autoGenderEnabled: boolean = true
  ) {
    this.stop();
    if (!cues || cues.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    this.playlistCues = cues;
    this.playlistIndex = Math.max(0, Math.min(startIndex, cues.length - 1));
    this.isContinuousPlaying = true;

    // Pre-buffer next 3 cues with gender resolution
    for (let i = this.playlistIndex; i < Math.min(cues.length, this.playlistIndex + 4); i++) {
      this.preloadCueAudio(cues[i], voice, autoGenderEnabled);
    }

    const playNext = () => {
      if (!this.isContinuousPlaying || this.playlistIndex >= this.playlistCues.length) {
        this.stop();
        if (onComplete) onComplete();
        return;
      }

      const cue = this.playlistCues[this.playlistIndex];
      const cueVoice = this.getVoiceForCue(cue, voice, autoGenderEnabled);

      if (onCueChange) {
        onCueChange(this.playlistIndex, cue, cueVoice);
      }

      // Preload subsequent cue
      const nextIdx = this.playlistIndex + 1;
      if (nextIdx < this.playlistCues.length) {
        this.preloadCueAudio(this.playlistCues[nextIdx], voice, autoGenderEnabled);
      }

      const genderParam = `&gender=${cueVoice.gender}&voice=${cueVoice.id}`;
      const url = `/api/tts?text=${encodeURIComponent(cue.text)}${genderParam}`;
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.playbackRate = Math.max(0.7, Math.min(1.8, speed * cueVoice.rateModifier));

      audio.onended = () => {
        if (this.isContinuousPlaying) {
          this.playlistIndex++;
          // 200ms natural breathing space between subtitles
          setTimeout(playNext, 200);
        }
      };

      audio.onerror = () => {
        if (this.isContinuousPlaying) {
          this.playlistIndex++;
          setTimeout(playNext, 200);
        }
      };

      audio.play().catch(() => {
        if (this.isContinuousPlaying) {
          this.playlistIndex++;
          setTimeout(playNext, 200);
        }
      });
    };

    playNext();
  }

  public isSpeakingContinuous(): boolean {
    return this.isContinuousPlaying;
  }

  public getPlaylistProgress(): { index: number; total: number } {
    return {
      index: this.playlistIndex,
      total: this.playlistCues.length,
    };
  }

  public stop() {
    this.isContinuousPlaying = false;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // audio element may already be closed
      }
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Backup fallback via Web Speech API in case of offline/network block
  private fallbackSpeechSynthesis(
    text: string,
    voice: VoiceProfile,
    speed: number,
    onEnd?: () => void
  ) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const mmVoice = voices.find((v) => v.lang.includes('my') || v.lang.includes('bur'));

      if (mmVoice) {
        utterance.voice = mmVoice;
      }
      utterance.pitch = voice.pitch;
      utterance.rate = Math.max(0.7, Math.min(1.8, speed * voice.rateModifier));

      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        if (onEnd) onEnd();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) onEnd();
    }
  }

  private playChime(baseFreq: number) {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 2, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.15);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio context might be restricted
    }
  }
}

export const audioSynthesizer = new VoiceSynthesizer();
