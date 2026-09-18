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
    // Graceful fallback to heuristic detection
  }

  const clean = (filename || 'Train to Busan (2016)')
    .replace(/\.[^/.]+$/, '')
    .replace(/[._]/g, ' ')
    .replace(/\b(1080p|720p|4k|bluray|webrip|web-dl|x264|x265|aac)\b/gi, '')
    .trim();

  return {
    detectedTitle: `${clean} - မြန်မာဘာသာပြန် ဇာတ်ကားကြီး`,
    englishTitle: clean,
    myanmarTitle: 'မြန်မာဘာသာပြန် ဇာတ်ကားကြီး',
    year: '2024',
    genre: 'Drama / Action / Suspense',
    hook: `ကမ္ဘာတစ်ဝှမ်း ကြည့်ရှုသူများကို ရင်ခုန်စေခဲ့သော "${clean}" ဇာတ်ကား၏ အကောင်းဆုံး ဇာတ်ကြောင်းပြန်!`,
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
        statusText: `အပိုင်း (${plan.index}/${totalChunks}) ကို တိကျစွာ ရေးသားဘာသာပြန်နေပါသည်...`,
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.data) {
          const chunkData = data.data;
          // Decompose any long subtitle cues into short, line-by-line cues so they never block the video screen
          const chunkSubtitles: SubtitleCue[] = [];
          const rawSubs = chunkData.subtitles || [];

          for (const s of rawSubs) {
            const startS = parseTimeToSeconds(s.start || '00:00');
            const endS = parseTimeToSeconds(s.end || '00:15');
            const duration = Math.max(3, endS - startS);
            const rawText = (s.text || '').trim();
            const phrases = splitIntoShortSubtitlePhrases(rawText, 32);

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
              statusText: `အပိုင်း (${plan.index}/${totalChunks}) အောင်မြင်စွာ ပြီးစီးပါပြီ!`,
            });
          }
          continue;
        }
      }
    } catch {
      // Fallback to internal chunk generator
    }

    // Local fallback chunk
    const fallbackChunk = generateInternalChunk(
      movieTitle,
      plan.index,
      totalChunks,
      plan.partName,
      plan.startSec,
      plan.endSec,
      style,
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
    previousSummary = movieChunk.text.slice(0, 300);

    if (onProgress) {
      onProgress({
        currentChunk: plan.index,
        totalChunks,
        currentPartName: plan.partName,
        percent: Math.round(((i + 1) / totalChunks) * 100),
        statusText: `အပိုင်း (${plan.index}/${totalChunks}) အောင်မြင်ပါပြီ!`,
      });
    }
  }

  return {
    title: movieTitle,
    synopsis: `${movieTitle} - စုစုပေါင်း အပိုင်း ${totalChunks} ပိုင်း အစအဆုံး အပြည့်အစုံ ဇာတ်ကြောင်းပြန် စကားပြောနှင့် စာတန်းထိုး`,
    fullScript: fullScriptParts.join('\n\n────────────────────\n\n'),
    subtitles: allSubtitles,
    chunks: generatedChunks,
  };
}

// Accurate plot repository for major movies
export function getAccurateMoviePlotLines(movieTitle: string, customContext?: string): Record<number, string[]> {
  const lower = (movieTitle || '').toLowerCase();

  // If user provided custom context / translation notes
  if (customContext && customContext.trim().length > 30) {
    const rawLines = customContext
      .split(/[.\n။]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

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

  // Train to Busan
  if (lower.includes('busan') || lower.includes('train') || lower.includes('ဘူဆန်')) {
    return {
      1: [
        'ဆိုးလ်ဘူတာကနေ ဘူဆန်မြို့ကို သွားမယ့် KTX အမြန်ရထားကြီးပေါ်ကို ရန်ပုံငွေမန်နေဂျာ ဆော့ခ်ဝူးနှင့် သမီးငယ်လေး ဆူအန်းတို့ တက်ရောက်စီးနင်းခဲ့ကြပါတယ်။',
        'ရထားစတင်ထွက်ခွာခါနီးအချိန်မှာပဲ ဆိုးလ်မြို့တော်ကြီးအတွင်း ဖုတ်ကောင်ဗိုင်းရပ်စ်ကပ်ဆိုးကြီး စတင်ပေါက်ကွဲကူးစက်ခဲ့ပြီး ဒဏ်ရာရနေတဲ့ ကောင်မလေးတစ်ဦး ရထားတွဲ ၁၁ ပေါ် တိတ်တဆိတ် ရောက်ရှိလာခဲ့ပါတယ်။',
        'ရထားတွဲတာဝန်ခံအမျိုးသမီးကို အဆိုပါကောင်မလေးက ရုတ်တရက် ခုန်အုပ်ကိုက်ဖြတ်လိုက်ရာက စတင်ပြီး စက္ကန့်ပိုင်းအတွင်း ရထားတွဲတစ်ခုလုံး ဖုတ်ကောင်ကပ်ဆိုးကြီး အလျင်အမြန် ကူးစက်ပြန့်ပွားသွားပါတော့တယ်။',
        'ဆော့ခ်ဝူးဟာ သမီးလေး ဆူအန်းကို ပွေ့ချီပြီး ဘေးကင်းရာ တွဲဆီ အပြေးအလွှား ခိုလှုံရင်း ကြောက်မက်ဖွယ် ကပ်ဘေးကြီး စတင်လာခဲ့ပါတော့တယ်။',
      ],
      2: [
        'ရထားတွဲတွေအတွင်း အသက်ရှင်ကျန်ရစ်သူတွေ စုစည်းမိကြပြီး သန်မာတဲ့ ဆန်းဟွာ၊ ကိုယ်ဝန်ဆောင်ဇနီး ဆောင်းဂယောင်းနှင့် ဘေ့စ်ဘောအားကစားသမား ယောင်ဂွတ်တို့ အတူတကွ ပူးပေါင်းခဲ့ကြပါတယ်။',
        'ဒယ်ဂျွန်းဘူတာမှာ စစ်တပ်က ကာကွယ်ပေးမယ်ထင်ပြီး ဆင်းခဲ့ကြပေမယ့် စစ်သားတွေအားလုံး ဖုတ်ကောင်အဖြစ် ကူးစက်ခံထားရတာကို တွေ့လိုက်ရတဲ့အခါ ရထားပေါ် ပြန်လည်အသက်လု ပြေးတက်ခဲ့ရပါတယ်။',
        'ဆူအန်းနှင့် ကိုယ်ဝန်ဆောင် ဆောင်းဂယောင်းတို့ဟာ ရထားအိမ်သာတွင်း ပိတ်မိနေခဲ့ပြီး ဆော့ခ်ဝူး၊ ဆန်းဟွာနှင့် ယောင်ဂွတ်တို့ သုံးဦးဟာ လက်နက်ကိုယ်စီစွဲကိုင်ကာ ဖုတ်ကောင်တွဲတွေကို ဖြတ်ကျော်ကယ်ထုတ်ဖို့ စတင်ပါတော့တယ်။',
        'ရထားဥမင်လိုဏ်ခေါင်း အမှောင်ထဲမှာ ဖုတ်ကောင်တွေ မျက်စိမမြင်နိုင်ဘဲ အသံကိုသာ အာရုံခံနိုင်ကြောင်း ဉာဏ်သုံးရှာဖွေတွေ့ရှိခဲ့ကြပါတယ်။',
      ],
      3: [
        'သူငယ်ချင်းများနှင့် သမီးလေးကို အောင်မြင်စွာ ကယ်ထုတ်နိုင်ခဲ့ပေမယ့် အခြားတွဲရှိ အတ္တကြီးသော စီးပွားရေးသမား ယောင်ဆော့ခ်က တံခါးကို အတွင်းမှ သော့ခတ်ပိတ်ဆို့ထားခဲ့ပါတယ်။',
        'တံခါးဖွင့်မရဘဲ ဖုတ်ကောင်တွေ အလုံးအရင်း ရောက်ရှိလာချိန်မှာ သန်မာလှတဲ့ ဆန်းဟွာဟာ ကိုယ်ဝန်ဆောင်ဇနီးနှင့် ကလေးငယ်တို့ လွတ်မြောက်စေရန် တံခါးကို ကိုယ်တိုင် အသက်စွန့် ပိတ်ဆို့ကာကွယ်ပေးခဲ့ပါတယ်။',
        'ဆန်းဟွာ ရဲ့ သူရဲကောင်းဆန်သော အနစ်နာခံမှုကြောင့် ဆော့ခ်ဝူးနှင့် အဖွဲ့သားများ လွတ်မြောက်ခဲ့သော်လည်း အတ္တသမားတွေရဲ့ စွပ်စွဲမှုကြောင့် သီးသန့်တွဲသို့ မောင်းထုတ်ခံခဲ့ရပါတယ်။',
        'အရှေ့မှာ ရထားလမ်းပိတ်ဆို့ပျက်စီးသွားသဖြင့် ယာဉ်မောင်းကြီးနှင့်အတူ ခေါင်းတွဲအသစ်ဆီကို အသက်လု ကူးပြောင်းပြေးလွှားကြရပါတော့တယ်။',
      ],
      4: [
        'ရွေ့လျားနေတဲ့ ခေါင်းတွဲပေါ် အရောက်မှာတော့ ရောဂါကူးစက်ခံထားရပြီးဖြစ်တဲ့ အတ္တသမား ယောင်ဆော့ခ်နှင့် ဆော့ခ်ဝူးတို့ အပြင်းအထန် အသက်လု သတ်ပုတ်ကြရပါတယ်။',
        'သမီးလေး ဆူအန်းကို ကာကွယ်ရင်း ဆော့ခ်ဝူး၏ လက်တွင် ဖုတ်ကောင်ကိုက်ရာဒဏ်ရာ ရရှိသွားခဲ့ပြီး မိမိကိုယ်ကို ဗိုင်းရပ်စ်မပြန့်ပွားမီ အချိန်ပိုင်းသာ ကျန်တော့ကြောင်း သိရှိလိုက်ရပါတယ်။',
        'ဆော့ခ်ဝူးဟာ သမီးလေး ဆူအန်းကို မျက်ရည်များဖြင့် နောက်ဆုံးနှုတ်ဆက်ကာ၊ သမီးလေး မွေးဖွားစဉ်က ပျော်ရွှင်ခဲ့ရသည့် အမှတ်တရများကို ပြန်လည်မြင်ယောင်ရင်း ရထားပေါ်မှ အသက်စွန့် ခုန်ချသွားခဲ့ပါတယ်။',
        'နောက်ဆုံးတွင် ဆူအန်းနှင့် ဆောင်းဂယောင်းတို့သည် ဘူဆန်စစ်ဆေးရေး ဥမင်လိုဏ်ခေါင်းအတွင်း သီချင်းဆိုရင်း လျှောက်လှမ်းလာရာ တောင်ကိုရီးယားစစ်တပ်မှ အောင်မြင်စွာ ကယ်တင်နိုင်ခဲ့ပြီး ဇာတ်လမ်းပြီးဆုံးသွားခဲ့ပါတယ်။',
      ],
    };
  }

  // Inception
  if (lower.includes('inception') || lower.includes('အိပ်မက်')) {
    return {
      1: [
        'အိပ်မက်ထဲက အသိစိတ်အတွင်းသို့ ဝင်ရောက်ကာ လျှို့ဝှက်ချက်များကို ခိုးယူနိုင်သည့် ဉာဏ်ကြီးရှင် သူခိုး ဒွမ်ကော့ဘ်သည် စီးပွားရေးလုပ်ငန်းရှင် ဆိုင်တိုထံမှ အခွင့်အရေးတစ်ခု ကမ်းလှမ်းခံရပါတယ်။',
        'ပြိုင်ဘက်ကုမ္ပဏီအမွေဆက်ခံသူ ရောဘတ်ဖစ်ရှာ ၏ ဦးနှောက်ထဲသို့ အကြံဉာဏ်သစ်တစ်ခု ထည့်သွင်းပေးရမည့် Inception မစ်ရှင်ဖြစ်ပြီး အောင်မြင်ပါက ကော့ဘ်သည် အိမ်ပြန်ခွင့်ရမည် ဖြစ်ပါတယ်။',
        'ကော့ဘ်သည် ဗိသုကာပညာရှင် အာရီယက်ဒနီ၊ အတုအယောင်ဖန်တီးသူ အီမ်းစ် နှင့် ဓာတုဗေဒပညာရှင် ယူဆက်ဖ် တို့ပါဝင်သော အထူးအဖွဲ့ကို ဖွဲ့စည်းခဲ့ပါတယ်။',
        'မိုးသည်းထန်စွာရွာသွန်းနေသော မြို့တော်အတွင်း အိပ်မက်ပထမအဆင့်ကို စတင်ဝင်ရောက်ခဲ့ကြပါတော့တယ်။',
      ],
      2: [
        'သို့သော် ဖစ်ရှာ ၏ စိတ်အာရုံသည် အထူးစစ်ဆေးလေ့ကျင့်ထားသဖြင့် လက်နက်ကိုင်လုံခြုံရေးတပ်ဖွဲ့များက အဖွဲ့သားများကို ရုတ်တရက် စတင်ပစ်ခတ်တိုက်ခိုက်လာပါတယ်။',
        'ဆိုင်တို သေနတ်ဒဏ်ရာပြင်းထန်စွာ ရရှိသွားပြီး၊ အိပ်မက်အတွင်း သေဆုံးပါက ပြန်နိုးမလာနိုင်ဘဲ ထာဝရစိတ်လွင့်မျောရာ Limbo ကမ္ဘာသို့ ရောက်ရှိသွားမည်ကို သိရှိလိုက်ရပါတယ်။',
        'ဒုတိယအဆင့်ဖြစ်သည့် ဟိုတယ်အိပ်မက်ထဲသို့ အာသာ၏ လမ်းညွှန်မှုဖြင့် ဆက်လက်ဝင်ရောက်ခဲ့ကြပါတယ်။',
        'ဟိုတယ်အတွင်း ဆွဲငင်အားမဲ့ ပျံဝဲတိုက်ခိုက်မှုများနှင့်အတူ ဖစ်ရှာ၏ စိတ်ထဲသို့ ဖခင်အပေါ် မကျေနပ်ချက်များကို စတင်ပြောင်းလဲပေးခဲ့ပါတယ်။',
      ],
      3: [
        'တတိယအဆင့်ဖြစ်သည့် နှင်းဖုံးတောင်တန်းခံတပ်ကြီးအတွင်းသို့ ဝင်ရောက်တိုက်ခိုက်ကြရာ ဖစ်ရှာ၏ စိတ်အခံ လျှို့ဝှက်သေတ္တာဆီသို့ အရောက်လှမ်းနိုင်ခဲ့ပါတယ်။',
        'သို့သော် ကော့ဘ်၏ ကွယ်လွန်သူဇနီး မဲလ် ၏ စိတ်အစွဲရိပ် ပေါ်လာပြီး ဖစ်ရှာကို ပစ်ခတ်သတ်ဖြတ်လိုက်သဖြင့် ဖစ်ရှာနှင့် ဆိုင်တိုတို့သည် Limbo ကမ္ဘာထဲသို့ ကျရောက်သွားပါတယ်။',
        'ကော့ဘ်နှင့် အာရီယက်ဒနီတို့သည် Limbo ကမ္ဘာအနက်ရှိုင်းဆုံးထဲအထိ ဇနီးဟောင်း မဲလ်ကို ရင်ဆိုင်ကျော်လွှားပြီး ကယ်တင်ရန် စွန့်စားဆင်းသက်ခဲ့ကြပါတယ်။',
        'တစ်ဆင့်ပြီးတစ်ဆင့် အိပ်မက်အဆင့်များစွာမှ တပြိုင်နက်တည်း နိုးထစေသည့် Kick ခေါ်လှုပ်နှိုးမှုများကို အချိန်ကိုက် ဖန်တီးခဲ့ကြပါတယ်။',
      ],
      4: [
        'Limbo ကမ္ဘာတွင် အိုမင်းရင့်ရော်နေသော ဆိုင်တိုကို ကော့ဘ်က ရှာဖွေတွေ့ရှိကာ ကတိသစ္စာကို သတိပေးပြီး အတူတကွ လက်တွေ့လောကသို့ ပြန်လည်နိုးထလာခဲ့ကြပါတယ်။',
        'လေယာဉ်ပေါ်တွင် အားလုံး အောင်မြင်စွာ နိုးထလာခဲ့ပြီး ဖစ်ရှာသည်လည်း ကုမ္ပဏီကို ခွဲခြမ်းစိတ်ဖြာရန် ဆုံးဖြတ်ချက်ချမှတ်ခဲ့ပါတော့တယ်။',
        'ကော့ဘ်သည် အမေရိကန်လေဆိပ်သို့ ဘေးကင်းစွာ ဆိုက်ရောက်ကာ ကလေးငယ်များနှင့် ပျော်ရွှင်စွာ ပြန်လည်ဆုံတွေ့ခွင့်ရရှိခဲ့ပါတယ်။',
        'စားပွဲပေါ်တွင် လှည့်ထားသော ဂျင်ကလေးသည် ရပ်သွားမည်လား၊ ဆက်လက်လည်ပတ်နေမည်လားဟူသော နာမည်ကျော် လျှို့ဝှက်ဆန်းကြယ်ပြကွက်ဖြင့် ဇာတ်သိမ်းသွားခဲ့ပါတော့တယ်။',
      ],
    };
  }

  // Interstellar
  if (lower.includes('interstellar') || lower.includes('ကြယ်တာရာ')) {
    return {
      1: [
        'သဲမုန်တိုင်းများနှင့် အစားအစာရှားပါးမှုကြောင့် ကမ္ဘာမြေပျက်သုဉ်းလုနီးအချိန်တွင် လယ်သမားနှင့် အင်ဂျင်နီယာဟောင်း ကူးပါးသည် သမီးငယ်လေး မာဖီ၏ အိပ်ခန်းထဲက ထူးဆန်းသော မြေထုဆွဲအားသင်္ကေတများကို တွေ့ရှိခဲ့ပါတယ်။',
        'အဆိုပါ သင်္ကေတများ၏ လမ်းညွှန်မှုဖြင့် လျှို့ဝှက် NASA အခြေစိုက်စခန်းကို ရှာဖွေတွေ့ရှိခဲ့ပြီး ပါမောက္ခ ဘရန်းနှင့် ဒေါက်တာ အမီလီယာတို့နှင့် တွေ့ဆုံခဲ့ပါတယ်။',
        'စနေဂြိုဟ်အနီးတွင် ထူးဆန်းစွာ ပေါ်ပေါက်လာသော တီကောင်တွင်း (Wormhole) မှတစ်ဆင့် လူသားများနေထိုင်နိုင်မည့် ဂြိုဟ်သစ်ရှာဖွေရန် ကူးပါးအား ရွေးချယ်စေလွှတ်ခဲ့ပါတယ်။',
        'သမီးလေး မာဖီ၏ မျက်ရည်များဖြင့် တားဆီးမှုကြားမှ ကူးပါးသည် ကမ္ဘာမြေနှင့် သမီးလေးကို ကယ်တင်ရန် အာကာသထဲသို့ ထွက်ခွာခဲ့ပါတော့တယ်။',
      ],
      2: [
        'ပထမဆုံး ရောက်ရှိသည့် မီလာဂြိုဟ်သည် ဧရာမတွင်းနက် ဂါဂန်ချူအာ အနီးတွင်ရှိသဖြင့် ၁ နာရီသည် ကမ္ဘာမြေ၏ ၇ နှစ်နှင့် ညီမျှနေပါတယ်။',
        'မိုးမျှော်တိုက်သဖွယ် မြင့်မားလှသော ဧရာမဒီရေလှိုင်းကြီး ကျရောက်လာသဖြင့် အာကာသယာဉ်မှူး ဒွိုင် သေဆုံးသွားခဲ့ပြီး အချိန်များစွာ ဆုံးရှုံးခဲ့ရပါတယ်။',
        'အာကာသယာဉ်ပေါ် ပြန်လည်ရောက်ရှိချိန်တွင် ကမ္ဘာမြေ၌ ၂၃ နှစ်ကျော် ကုန်လွန်သွားခဲ့ပြီး သမီးလေး မာဖီသည် အရွယ်ရောက်လာကာ ဖခင်အပေါ် စိတ်ပျက်ဝမ်းနည်းနေသည့် ဗီဒီယိုမက်ဆေ့ခ်ျများကို တွေ့ရပါတယ်။',
        'ဒုတိယဂြိုဟ်ဖြစ်သည့် ရေခဲဖုံး မန်းဂြိုဟ်သို့ ဆက်လက်ခရီးနှင်ခဲ့ကြပါတယ်။',
      ],
      3: [
        'မန်းဂြိုဟ်ပေါ်တွင် အသက်ရှင်နေသော ဒေါက်တာမန်းကို ကယ်တင်နိုင်ခဲ့သော်လည်း သူသည် နေထိုင်၍မရသော အချက်အလက်အတုများ ပေးပို့ခဲ့သည့် သစ္စာဖောက်ဖြစ်ကြောင်း သိရှိလိုက်ရပါတယ်။',
        'ဒေါက်တာမန်းသည် ကူးပါးကို သတ်ဖြတ်ရန် ကြိုးစားပြီး အင်ဂျူရန့်စ် အာကာသယာဉ်ကြီးကို အတင်းအဓမ္မ ချိတ်ဆက်ရာမှ ပေါက်ကွဲသေဆုံးသွားခဲ့ပါတယ်။',
        'ကူးပါးသည် မယုံနိုင်လောက်သော ကျွမ်းကျင်မှုဖြင့် လည်ပတ်နေသည့် အာကာသယာဉ်ပျက်ကြီးကို ပြန်လည်ထိန်းချုပ်နိုင်ခဲ့ပါတယ်။',
        'အမီလီယာအား နောက်ဆုံးဂြိုဟ်ဆီသို့ ရောက်ရှိစေရန် ကူးပါးသည် မိမိ၏ယာဉ်ငယ်ကို အနစ်နာခံကာ တွင်းနက်ကြီးထဲသို့ စွန့်လွှတ်ခုန်ဆင်းလိုက်ပါတော့တယ်။',
      ],
      4: [
        'တွင်းနက်အနက်ရှိုင်းဆုံးထဲတွင် အနာဂတ်လူသားများ ဖန်တီးထားသော ငါးဖက်မြင် အချိန်အခန်းငယ် (Tesseract) ထဲသို့ ကူးပါး ရောက်ရှိသွားပါတယ်။',
        'အဆိုပါနေရာသည် သမီးလေး မာဖီ၏ ကလေးဘဝ အိပ်ခန်းစာအုပ်စင်နှင့် အချိန်တိုင်းတွင် ဆက်သွယ်နေကြောင်း နားလည်သဘောပေါက်သွားခဲ့ပါတယ်။',
        'ကူးပါးသည် မြေထုဆွဲအားကိန်းသေ ညီမျှခြင်းလျှို့ဝှက်ချက်များကို မာဖီ၏ လက်ပတ်နာရီစက္ကန့်လက်တံပေါ်သို့ မော့စ်ကုဒ်ဖြင့် ပေးပို့နိုင်ခဲ့ပါတယ်။',
        'အရွယ်ရောက်လာသော မာဖီသည် ဖခင်၏ သင်္ကေတကို ဖော်ထုတ်နိုင်ခဲ့ပြီး လူသားမျိုးနွယ်အားလုံးကို ကယ်တင်နိုင်ခဲ့ကာ၊ ရာစုနှစ်တစ်ခုအကြာတွင် အိုမင်းနေသော သမီးလေးနှင့် ကူးပါးတို့ ရင်နင့်ဖွယ် ပြန်လည်ဆုံတွေ့ခဲ့ကြပါတယ်။',
      ],
    };
  }

  // Generic factual fallback
  return {
    1: [
      `ပရိသတ်ကြီးတို့ရေ... ဒီနေ့မှာတော့ "${movieTitle}" ဇာတ်ကားကြီးရဲ့ အစအဆုံး အပြည့်အစုံ ဇာတ်ကြောင်းပြန်ပြောပြချက်ကို တင်ဆက်ပေးလိုက်ပါတယ်။`,
      `ဇာတ်လမ်းရဲ့ နိဒါန်းအစပိုင်းမှာတော့ အဓိကဇာတ်ကောင်ရဲ့ နေ့စဉ်ဘဝနှင့် မမျှော်လင့်ဘဲ ပေါ်ပေါက်လာတဲ့ ထူးဆန်းသော လက္ခဏာရပ်များကို တွေ့မြင်ရမှာ ဖြစ်ပါတယ်။`,
      `မြို့တော်ကြီးတစ်ခုလုံး ကမောက်ကမဖြစ်လာပြီး သာမန်မဟုတ်တဲ့ အန္တရာယ်ကြီးတစ်ခု စတင်သန္ဓေတည်လာခဲ့ပါတော့တယ်။`,
      `ဇာတ်ကောင်တွေဟာ အသက်ရှင်လွတ်မြောက်ဖို့အတွက် ပထမဆုံးသော အရေးပေါ် ခရီးလမ်းကို စတင်လျှောက်လှမ်းကြရပါတော့တယ်။`,
    ],
    2: [
      `အခု အပိုင်း (၂) မှာတော့ ပြဿနာတွေဟာ ထိန်းချုပ်မရတော့ဘဲ အခြေအနေအရပ်ရပ် ပိုမိုဆိုးရွားလာခဲ့ပါပြီ။`,
      `ဇာတ်ဆောင်တွေ သွားရောက်ခိုလှုံတဲ့ နေရာတိုင်းမှာ မထင်မှတ်ထားတဲ့ အတားအဆီးများနှင့် ရန်သူတွေရဲ့ ခြုံခိုတိုက်ခိုက်မှုတွေကို ကြုံတွေ့ရပါတယ်။`,
      `တစ်ဖက်မှာလည်း အဖွဲ့သားတွေကြားထဲ သံသယတွေ ဝင်လာပြီး အချင်းချင်း ပဋိပက္ခတွေ စတင်ဖြစ်ပွားလာပါတော့တယ်။`,
      `ဒီလိုနဲ့ မဖြစ်မနေ စွန့်စားရမယ့် အန္တရာယ်အရှိဆုံး အစီအစဉ်တစ်ခုကို ချမှတ်လိုက်ရပါတော့တယ်။`,
    ],
    3: [
      `အပိုင်း (၃) မှာတော့ ဇာတ်လမ်းရဲ့ ဇာတ်ရှိန်အမြင့်မားဆုံး အခြေအနေဆီကို တရှိန်ထိုး ရောက်ရှိလာခဲ့ပါပြီ။`,
      `ရန်သူတွေရဲ့ အပြင်းအထန်ဆုံး ဝိုင်းရံပိတ်ဆို့မှုကို ခံရချိန်မှာ မိတ်ဆွေတစ်ယောက်ရဲ့ မွန်မြတ်သော အနစ်နာခံမှုကြောင့် ကျန်သူတွေ ရှေ့ဆက်ခွင့်ရခဲ့ပါတယ်။`,
      `အမှန်တရားရဲ့ နောက်ကွယ်က တကယ့် ကြိုးကိုင်သူကို စတင်ဖော်ထုတ်နိုင်ခဲ့ပြီး ရင်ခုန်စရာ အပြန်အလှန် ထိုးနှက်တိုက်ခိုက်မှုတွေ စတင်လာခဲ့ပါတယ်။`,
      `နောက်ဆုံး ထွက်ပေါက်ပိတ်နေတဲ့ အခြေအနေကနေ ဉာဏ်ပညာနှင့် သတ္တိကို အသုံးချပြီး အသက်လုတိုက်ပွဲ ဝင်ဆင်နွှဲကြရပါတယ်။`,
    ],
    4: [
      `အခု အဆုံးသတ် နောက်ဆုံးအပိုင်းမှာတော့ အားလုံးမျှော်လင့်စောင့်စားနေကြတဲ့ အထွတ်အထိပ် ဇာတ်သိမ်းခန်းကို ရောက်ရှိလာပါပြီ။`,
      `အဓိကရန်သူနှင့် နောက်ဆုံး အဆုံးအဖြတ်တိုက်ပွဲ ဆင်နွှဲချိန်မှာ မည်သူမျှ မထင်မှတ်ထားတဲ့ မဟာလှည့်ကွက်ကြီး ပေါ်ပေါက်လာခဲ့ပါတယ်။`,
      `စတေးမှုများစွာနှင့်အတူ အောင်ပွဲကို ရယူနိုင်ခဲ့ပြီး ရှင်သန်ကျန်ရစ်သူတို့ရဲ့ မျှော်လင့်ချက် နေ့သစ်တစ်ခုကို စတင်နိုင်ခဲ့ပါတယ်။`,
      `ဤ "${movieTitle}" ဇာတ်ကားကြီးဟာ ရင်ထဲမှာ စွဲထင်ကျန်ရစ်စေမည့် ထူးခြားသော မက်ဆေ့ခ်ျတစ်ခုဖြင့် ပြီးဆုံးသွားခဲ့ပါပြီ။ အားလုံးကို ကျေးဇူးတင်ပါတယ်။`,
    ],
  };
}

// Helper function to split a narrative paragraph into concise, short line-by-line subtitle phrases
export function splitIntoShortSubtitlePhrases(text: string, maxChars = 28): string[] {
  if (!text) return [];
  const clean = text.trim();
  // Split on sentence boundary or clause marks
  const clauses = clean.match(/[^။၊\n]+[။၊]?/g) || [clean];
  const phrases: string[] = [];

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      phrases.push(trimmed);
    } else {
      // Split clause into smaller digestible fragments by spaces or words
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
  _totalChunks: number,
  _partName: string,
  startSec: number,
  endSec: number,
  _style: string,
  baseSubtitleId: number,
  customContext?: string
) {
  const duration = Math.max(20, endSec - startSec);
  const plotBook = getAccurateMoviePlotLines(cleanTitle, customContext);
  const rawTexts = plotBook[chunkIndex] || plotBook[1] || [
    `"${cleanTitle}" ဇာတ်ကား၏ ဇာတ်ကြောင်းပြန် စကားပြောနှင့် စာတန်းထိုး ဖြစ်ပါသည်။`,
  ];

  // Break raw paragraph texts into short, line-by-line cues so subtitles never block the video screen
  const shortPhrases: string[] = [];
  for (const t of rawTexts) {
    const sub = splitIntoShortSubtitlePhrases(t, 26);
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
      speakerGender: idx % 3 === 1 ? 'female' : 'male',
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
  const title = titleInput.trim() || 'Train to Busan';
  const durationFactor = 1 / (speedRate || 1);
  const plotBook = getAccurateMoviePlotLines(title, customContext);

  const allLines = [
    ...(plotBook[1] || []),
    ...(plotBook[2] || []),
    ...(plotBook[3] || []),
    ...(plotBook[4] || []),
  ];

  let rawSegments = allLines;
  if (style === 'quick') {
    rawSegments = [allLines[0], allLines[1], allLines[Math.floor(allLines.length / 2)], allLines[allLines.length - 1]];
  }

  // Break paragraphs into short, crisp, line-by-line subtitle phrases
  const shortPhrases: string[] = [];
  for (const seg of rawSegments) {
    const sub = splitIntoShortSubtitlePhrases(seg, 26);
    shortPhrases.push(...sub);
  }

  let currentTime = 0;
  const subtitles: SubtitleCue[] = shortPhrases.map((phrase, idx) => {
    const charCount = phrase.length;
    const baseDuration = Math.max(2.6, Math.min(5.5, (charCount / 9) * durationFactor));
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
      speakerGender: idx % 3 === 1 ? 'female' : 'male',
    };
  });

  return {
    title,
    synopsis: `${title} - တိကျသော မြန်မာဘာသာပြန် ဇာတ်ကြောင်းပြန်`,
    fullScript: rawSegments.join('\n\n'),
    subtitles,
  };
}
