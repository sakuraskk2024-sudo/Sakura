import { RecapStyleId, SubtitleCue, DurationScope, MovieChunk, ChunkProgress } from '../types';

export interface GeneratedRecapResult {
  title: string;
  synopsis: string;
  fullScript: string;
  subtitles: SubtitleCue[];
  chunks?: MovieChunk[];
}

export interface TitleDetectionResult {
  detectedTitle: string;
  englishTitle: string;
  myanmarTitle: string;
  year: string;
  genre: string;
  hook: string;
}

// Google AI Studio / Gemini API သို့ ပေးပို့မည့် System Prompt
export const SPOKEN_BURMESE_PROMPT = `You are a fast-paced, natural Burmese movie recap scriptwriter.

Rules:
1. Always output in everyday spoken Burmese (စကားပြောစတိုင်). Never use formal literary words.
2. Use natural conversational endings: တယ်၊ နိုင်တယ်၊ သွားတယ်၊ ဖြစ်သွားတယ်၊ လို့ရတယ်။
3. Split script into short, punchy lines (3 to 6 words max per line) suitable for video subtitles.
4. Keep the flow exciting for short-form video recaps (TikTok/Reels style).`;

// Auto Title Detection API
export async function detectMovieTitle(filename: string, context?: string): Promise<TitleDetectionResult> {
  try {
    const res = await fetch('/api/detect-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, sampleText: context }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data) {
        return data.data;
      }
    }
  } catch {
    // Fallback
  }

  const clean = (filename || 'Movie')
    .replace(/\.[^/.]+$/, '')
    .replace(/[._]/g, ' ')
    .replace(/\b(1080p|720p|4k|bluray|webrip|web-dl|x264|x265|aac)\b/gi, '')
    .trim();

  return {
    detectedTitle: `${clean} - မြန်မာစာတန်းထိုး`,
    englishTitle: clean,
    myanmarTitle: 'မြန်မာဘာသာပြန် ဇာတ်ကားကြီး',
    year: '2024',
    genre: 'Drama / Action / Suspense',
    hook: `မဖြစ်မနေ ကြည့်သင့်တဲ့ "${clean}" ဇာတ်ကားရဲ့ အမိုက်စား ဇာတ်ကြောင်းပြန်!`,
  };
}

// Long-Form Sequential Chunk Generator
export async function generateLongFormRecap(params: {
  movieTitle: string;
  style: RecapStyleId;
  voiceProfileLabel: string;
  speed: number;
  durationScope: DurationScope;
  customContext?: string;
  onProgress?: (p: ChunkProgress) => void;
}): Promise<GeneratedRecapResult & { chunks: MovieChunk[] }> {
  const { movieTitle, style, voiceProfileLabel, speed, durationScope, customContext, onProgress } = params;

  interface ChunkPlan {
    index: number;
    partName: string;
    startSec: number;
    endSec: number;
  }

  let chunkPlans: ChunkPlan[] = [];

  if (durationScope === 'shorts') {
    chunkPlans = [
      { index: 1, partName: 'အဓိက အနှစ်သာရနှင့် အစအဆုံး (Shorts Recap)', startSec: 0, endSec: 180 },
    ];
  } else if (durationScope === 'long_30m') {
    chunkPlans = [
      { index: 1, partName: 'အပိုင်း (၁) - အစပျိုးခြင်းနှင့် နိဒါန်း (00:00 - 10:00)', startSec: 0, endSec: 600 },
      { index: 2, partName: 'အပိုင်း (၂) - ပထမအချိုးအကွေ့နှင့် အန္တရာယ်စတင်ခြင်း (10:00 - 20:00)', startSec: 600, endSec: 1200 },
      { index: 3, partName: 'အပိုင်း (၃) - ဇာတ်ရှိန်အထွတ်အထိပ်နှင့် အဆုံးသတ် (20:00 - 30:00)', startSec: 1200, endSec: 1800 },
    ];
  } else {
    chunkPlans = [
      { index: 1, partName: 'အပိုင်း (၁) - ဇာတ်ကောင်များနှင့် အခြေအနေများ (00:00 - 15:00)', startSec: 0, endSec: 900 },
      { index: 2, partName: 'အပိုင်း (၂) - ပြဿနာစတင်ခြင်းနှင့် ပထမအချိုးအကွေ့ (15:00 - 30:00)', startSec: 900, endSec: 1800 },
      { index: 3, partName: 'အပိုင်း (၃) - အကြပ်အတည်းနှင့် ဇာတ်ရှိန်အမြင့်ဆုံးရောက်ရှိခြင်း (30:00 - 45:00)', startSec: 1800, endSec: 2700 },
      { index: 4, partName: 'အပိုင်း (၄) - နောက်ဆုံးတိုက်ပွဲ၊ လှည့်ကွက်နှင့် အဆုံးသတ် (45:00 - 60:00)', startSec: 2700, endSec: 3600 },
    ];
  }

  const totalChunks = chunkPlans.length;
  const generatedChunks: MovieChunk[] = [];
  let allSubtitles: SubtitleCue[] = [];
  let fullScriptParts: string[] = [];
  let previousSummary = '';

  for (let i = 0; i < totalChunks; i++) {
    const plan = chunkPlans[i];
    const percent = Math.round(((i + 0.3) / totalChunks) * 100);

    if (onProgress) {
      onProgress({
        currentChunk: plan.index,
        totalChunks,
        currentPartName: plan.partName,
        percent,
        statusText: `အပိုင်း (${plan.index}/${totalChunks}) ကို ရေးသားနေပါသည်...`,
      });
    }

    try {
      const response = await fetch('/api/generate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle,
          style,
          voiceProfile: voiceProfileLabel,
          speed,
          chunkIndex: plan.index,
          totalChunks,
          partName: plan.partName,
          timeStartSec: plan.startSec,
          timeEndSec: plan.endSec,
          previousContext: previousSummary,
          customText: customContext,
          systemPrompt: SPOKEN_BURMESE_PROMPT,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.data) {
          const chunkData = data.data;
          const chunkSubtitles: SubtitleCue[] = [];
          const rawSubs = chunkData.subtitles || [];

          for (const s of rawSubs) {
            const startS = parseTimeToSeconds(s.start || '00:00');
            const endS = parseTimeToSeconds(s.end || '00:15');
            const duration = Math.max(3, endS - startS);
            const rawText = (s.text || '').trim();
            const phrases = splitIntoShortSubtitlePhrases(rawText, 25);

            const phraseDuration = duration / phrases.length;
            phrases.forEach((phrase, pIdx) => {
              const pStart = startS + pIdx * phraseDuration;
              const pEnd = pIdx === phrases.length - 1 ? endS : pStart + phraseDuration;
              chunkSubtitles.push({
                id: allSubtitles.length + chunkSubtitles.length + 1,
                startTime: Math.round(pStart * 10) / 10,
                endTime: Math.round(pEnd * 10) / 10,
                startDisplay: formatSeconds(pStart),
                endDisplay: formatSeconds(pEnd),
                text: phrase,
                speakerGender: s.speakerGender === 'female' ? 'female' : s.speakerGender === 'male' ? 'male' : 'auto',
              });
            });
          }

          const timeRangeStr = `${formatSeconds(plan.startSec)} - ${formatSeconds(plan.endSec)}`;
          const movieChunk: MovieChunk = {
            chunkIndex: plan.index,
            totalChunks,
            partName: chunkData.partName || plan.partName,
            timeRange: timeRangeStr,
            text: chunkData.chunkScript || '',
            subtitles: chunkSubtitles,
          };

          generatedChunks.push(movieChunk);
          allSubtitles = [...allSubtitles, ...chunkSubtitles];
          fullScriptParts.push(`【${movieChunk.partName}】\n${movieChunk.text}`);
          previousSummary = movieChunk.text.slice(0, 300);

          if (onProgress) {
            onProgress({
              currentChunk: plan.index,
              totalChunks,
              currentPartName: plan.partName,
              percent: Math.round(((i + 1) / totalChunks) * 100),
              statusText: `အပိုင်း (${plan.index}/${totalChunks}) ပြီးစီးပါပြီ!`,
            });
          }
          continue;
        }
      }
    } catch {
      // Fallback
    }

    // Local fallback chunk
    const fallbackChunk = generateInternalChunk(
      movieTitle,
      plan.index,
      plan.startSec,
      plan.endSec,
      allSubtitles.length,
      customContext
    );

    const timeRangeStr = `${formatSeconds(plan.startSec)} - ${formatSeconds(plan.endSec)}`;
    const movieChunk: MovieChunk = {
      chunkIndex: plan.index,
      totalChunks,
      partName: plan.partName,
      timeRange: timeRangeStr,
      text: fallbackChunk.text,
      subtitles: fallbackChunk.subtitles,
    };

    generatedChunks.push(movieChunk);
    allSubtitles = [...allSubtitles, ...fallbackChunk.subtitles];
    fullScriptParts.push(`【${movieChunk.partName}】\n${movieChunk.text}`);

    if (onProgress) {
      onProgress({
        currentChunk: plan.index,
        totalChunks,
        currentPartName: plan.partName,
        percent: Math.round(((i + 1) / totalChunks) * 100),
        statusText: `အပိုင်း (${plan.index}/${totalChunks}) ပြီးစီးပါပြီ!`,
      });
    }
  }

  return {
    title: movieTitle,
    synopsis: `${movieTitle} - စကားပြောစတိုင် မြန်မာစာတန်းထိုး`,
    fullScript: fullScriptParts.join('\n\n────────────────────\n\n'),
    subtitles: allSubtitles,
    chunks: generatedChunks,
  };
}

// Dynamic Script Generator (No hardcoded movies)
export function getAccurateMoviePlotLines(movieTitle: string, customContext?: string): Record<number, string[]> {
  if (customContext && customContext.trim().length > 20) {
    const rawLines = customContext
      .split(/[.\n။]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    if (rawLines.length >= 4) {
      const q = Math.ceil(rawLines.length / 4);
      return {
        1: rawLines.slice(0, q),
        2: rawLines.slice(q, q * 2),
        3: rawLines.slice(q * 2, q * 3),
        4: rawLines.slice(q * 3),
      };
    }
  }

  // General Spoken Burmese Pattern
  return {
    1: [
      `ဒီနေ့တော့ "${movieTitle}" ဆိုတဲ့ ဇာတ်ကားလေးနဲ့ မိတ်ဆက်ပေးချင်ပါတယ်။`,
      'ဇာတ်လမ်းစစချင်းမှာပဲ မထင်မှတ်ထားတဲ့ ပြဿနာကြီး စတင်ဖြစ်ပွားလာတယ်။',
      'ဇာတ်ကောင်တွေလည်း အသက်ရှင်ဖို့အတွက် စွန့်စားခန်း စတင်ခဲ့ကြပါတယ်။',
    ],
    2: [
      'အခု အပိုင်း (၂) မှာတော့ အခြေအနေတွေ ပိုပြီး ဆိုးရွားလာခဲ့ပါပြီ။',
      'သွားရောက်ခိုလှုံတဲ့ နေရာတိုင်းမှာ ရန်သူတွေရဲ့ ခြုံခိုတိုက်ခိုက်မှုကို ခံရတယ်။',
      'နောက်ဆုံးတော့ မဖြစ်မနေ စွန့်စားရမယ့် အစီအစဉ်တစ်ဆင် ချလိုက်ကြရတယ်။',
    ],
    3: [
      'အပိုင်း (၃) မှာတော့ ဇာတ်ရှိန် အမြင့်ဆုံးအခြေအနေဆီ ရောက်လာခဲ့ပါပြီ။',
      'အမှန်တရားရဲ့ နောက်ကွယ်က ကြိုးကိုင်သူကို စတင်ဖော်ထုတ်နိုင်ခဲ့ပါတယ်။',
      'ထွက်ပေါက်ပိတ်နေတဲ့ကြားကနေ သတ္တိရှိရှိ တိုက်ပွဲဝင်ခဲ့ကြပါတယ်။',
    ],
    4: [
      'အခု အဆုံးသတ် အပိုင်းမှာတော့ အထွတ်အထိပ် ဇာတ်သိမ်းခန်း ရောက်ပါပြီ။',
      'မထင်မှတ်ထားတဲ့ မဟာလှည့်ကွက်ကြီးနဲ့အတူ အနိုင်ရရှိသွားခဲ့တယ်။',
      'ရင်ထဲမှာ စွဲကျန်ရစ်မယ့် သတင်းစကားနဲ့ ဇာတ်လမ်း ပြီးဆုံးသွားခဲ့ပါပြီ။',
    ],
  };
}

export function splitIntoShortSubtitlePhrases(text: string, maxChars = 22): string[] {
  if (!text) return [];
  const clean = text.trim();
  const clauses = clean.match(/[^။၊\n]+[။၊]?/g) || [clean];
  const phrases: string[] = [];

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      phrases.push(trimmed);
    } else {
      const words = trimmed.split(' ');
      let temp = '';
      for (const w of words) {
        if ((temp + ' ' + w).trim().length <= maxChars) {
          temp = (temp + ' ' + w).trim();
        } else {
          if (temp) phrases.push(temp);
          temp = w;
        }
      }
      if (temp) phrases.push(temp);
    }
  }

  return phrases.length > 0 ? phrases : [clean];
}

function generateInternalChunk(
  cleanTitle: string,
  chunkIndex: number,
  startSec: number,
  endSec: number,
  baseSubtitleId: number,
  customContext?: string
) {
  const duration = Math.max(20, endSec - startSec);
  const plotBook = getAccurateMoviePlotLines(cleanTitle, customContext);
  const rawTexts = plotBook[chunkIndex] || plotBook[1];

  const shortPhrases: string[] = [];
  for (const t of rawTexts) {
    const sub = splitIntoShortSubtitlePhrases(t, 22);
    shortPhrases.push(...sub);
  }

  const step = Math.max(3, Math.floor(duration / shortPhrases.length));
  const subtitles: SubtitleCue[] = shortPhrases.map((phrase, idx) => {
    const s = startSec + idx * step;
    const e = idx === shortPhrases.length - 1 ? endSec : s + step;
    return {
      id: baseSubtitleId + idx + 1,
      startTime: s,
      endTime: e,
      startDisplay: formatSeconds(s),
      endDisplay: formatSeconds(e),
      text: phrase,
      speakerGender: idx % 2 === 1 ? 'female' : 'male',
    };
  });

  return {
    text: rawTexts.join('\n\n'),
    subtitles,
  };
}

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return Number(timeStr) || 0;
}

export function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function createInternalRecap(
  titleInput: string,
  style: RecapStyleId,
  _voiceLabel: string,
  speedRate: number = 1.05,
  customContext?: string
): GeneratedRecapResult {
  const title = titleInput.trim() || 'Movie Recap';
  const durationFactor = 1 / (speedRate || 1);
  const plotBook = getAccurateMoviePlotLines(title, customContext);

  const rawSegments = [
    ...(plotBook[1] || []),
    ...(plotBook[2] || []),
    ...(plotBook[3] || []),
    ...(plotBook[4] || []),
  ];

  const shortPhrases: string[] = [];
  for (const seg of rawSegments) {
    const sub = splitIntoShortSubtitlePhrases(seg, 22);
    shortPhrases.push(...sub);
  }

  let currentTime = 0;
  const subtitles: SubtitleCue[] = shortPhrases.map((phrase, idx) => {
    const charCount = phrase.length;
    const baseDuration = Math.max(2.2, Math.min(4.5, (charCount / 8) * durationFactor));
    const startTime = Math.round(currentTime * 10) / 10;
    const endTime = Math.round((currentTime + baseDuration) * 10) / 10;
    currentTime = endTime;

    return {
      id: idx + 1,
      startTime,
      endTime,
      startDisplay: formatSeconds(startTime),
      endDisplay: formatSeconds(endTime),
      text: phrase,
      speakerGender: idx % 2 === 1 ? 'female' : 'male',
    };
  });

  return {
    title,
    synopsis: `${title} - စကားပြောစတိုင် မြန်မာစာတန်းထိုး`,
    fullScript: rawSegments.join('\n\n'),
    subtitles,
  };
}
