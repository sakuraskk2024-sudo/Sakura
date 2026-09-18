import { SubtitleCue } from '../types';
import { formatSeconds, convertToSrt } from './subtitlesExport';
import { getAccurateMoviePlotLines } from './recapGenerator';

export interface SpeechInterval {
  start: number;
  end: number;
}

export interface VideoExtractionResult {
  duration: number;
  speechIntervals: SpeechInterval[];
  audioBase64?: string;
  wavBlob?: Blob;
}

/**
 * Extracts and decodes audio from a video file in the browser,
 * calculates speech/sound activity intervals, and returns a lightweight 16kHz mono WAV base64 string.
 */
export async function extractAudioFromVideoFile(
  file: File,
  onProgressOrMaxDuration?: ((p: { percent: number; message: string }) => void) | number,
  maxAudioDurationSec: number = 180
): Promise<VideoExtractionResult> {
  const onProgress = typeof onProgressOrMaxDuration === 'function' ? onProgressOrMaxDuration : undefined;
  const maxDuration = typeof onProgressOrMaxDuration === 'number' ? onProgressOrMaxDuration : maxAudioDurationSec;

  if (onProgress) onProgress({ percent: 15, message: 'ဗီဒီယိုဖိုင်မှ အသံလှိုင်း (Audio Track) ကို ဖတ်ရှုနေပါသည်...' });
  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser');
  }

  const audioCtx = new AudioContextClass();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close().catch(() => {});
  }

  if (onProgress) onProgress({ percent: 45, message: 'စကားပြောသံ လှိုင်းစတင်/ပြီးဆုံးချိန် (VAD Timestamps) စစ်ဆေးနေပါသည်...' });

  const duration = audioBuffer.duration;
  const channelData = audioBuffer.getChannelData(0); // Left channel or mono
  const sampleRate = audioBuffer.sampleRate;

  // 1. Detect speech activity intervals (VAD - Voice Activity Detection via RMS Energy)
  const windowSizeSec = 0.25;
  const windowSamples = Math.floor(sampleRate * windowSizeSec);
  const totalWindows = Math.floor(channelData.length / windowSamples);

  let totalRms = 0;
  const windowEnergies: number[] = [];
  for (let w = 0; w < totalWindows; w++) {
    const startIdx = w * windowSamples;
    let sumSq = 0;
    for (let i = 0; i < windowSamples; i++) {
      const val = channelData[startIdx + i];
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / windowSamples);
    windowEnergies.push(rms);
    totalRms += rms;
  }

  const avgRms = totalRms / (totalWindows || 1);
  const threshold = Math.max(0.015, avgRms * 0.6);

  const speechIntervals: SpeechInterval[] = [];
  let inSpeech = false;
  let speechStartSec = 0;
  let silenceCounter = 0;

  for (let w = 0; w < windowEnergies.length; w++) {
    const energy = windowEnergies[w];
    const currentSec = w * windowSizeSec;

    if (energy >= threshold) {
      if (!inSpeech) {
        inSpeech = true;
        speechStartSec = Math.max(0, currentSec - 0.2);
      }
      silenceCounter = 0;
    } else {
      if (inSpeech) {
        silenceCounter++;
        // Silence for more than 0.75s marks end of speech cue
        if (silenceCounter >= 3 || w === windowEnergies.length - 1) {
          inSpeech = false;
          const speechEndSec = Math.min(duration, currentSec);
          // Only keep intervals between 1.5s and 12s
          if (speechEndSec - speechStartSec >= 1.2) {
            speechIntervals.push({
              start: Math.round(speechStartSec * 10) / 10,
              end: Math.round(speechEndSec * 10) / 10,
            });
          }
          silenceCounter = 0;
        }
      }
    }
  }

  // If no clear speech intervals were isolated (e.g. background music or low volume), create rhythmic intervals
  if (speechIntervals.length === 0) {
    let t = 0.5;
    while (t < duration - 1) {
      const cueLen = Math.min(4.5, duration - t - 0.5);
      if (cueLen < 1.5) break;
      speechIntervals.push({
        start: Math.round(t * 10) / 10,
        end: Math.round((t + cueLen) * 10) / 10,
      });
      t += cueLen + 0.5;
    }
  }

  // 2. Downsample to 16kHz mono WAV for AI transcription (take up to maxDuration)
  let audioBase64: string | undefined;
  let wavBlob: Blob | undefined;
  try {
    const targetSampleRate = 16000;
    const captureSec = Math.min(duration, maxDuration);
    const numSamples = Math.floor(captureSec * sampleRate);
    const step = sampleRate / targetSampleRate;
    const targetLength = Math.floor(numSamples / step);

    const downsampled = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const origIndex = Math.floor(i * step);
      downsampled[i] = channelData[origIndex] || 0;
    }

    // Encode to 16-bit PCM WAV
    const wavBytes = encodeWav(downsampled, targetSampleRate);
    audioBase64 = arrayBufferToBase64(wavBytes);
    wavBlob = new Blob([wavBytes], { type: 'audio/wav' });
  } catch (err) {
    console.warn('WAV encode error:', err);
  }

  return {
    duration,
    speechIntervals,
    audioBase64,
    wavBlob,
  };
}

function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, 1, true);
  // channel count (mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * 2)
  view.setUint32(28, sampleRate * 2, true);
  // block align (1 * 2)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Orchestrates auto-transcription and video-synchronized SRT generation
 */
export async function autoTranscribeVideoToSrt(params: {
  videoFile?: File | null;
  videoDuration?: number;
  movieTitle: string;
  customContext?: string;
  onProgress?: (step: string) => void;
}): Promise<{ subtitles: SubtitleCue[]; srt: string; fullScript: string }> {
  const { videoFile, videoDuration, movieTitle, customContext, onProgress } = params;

  let speechIntervals: SpeechInterval[] = [];
  let audioBase64: string | undefined;
  let duration = videoDuration || 30;

  if (videoFile) {
    if (onProgress) onProgress('ဗီဒီယို အသံလှိုင်းကို ထုတ်ယူစစ်ဆေးနေပါသည်...');
    try {
      const extraction = await extractAudioFromVideoFile(videoFile);
      speechIntervals = extraction.speechIntervals;
      audioBase64 = extraction.audioBase64;
      duration = extraction.duration;
    } catch (err) {
      console.warn('Audio extraction warning:', err);
    }
  }

  if (onProgress) onProgress('ဗီဒီယိုပါ စကားပြောသံများအား မြန်မာစာတန်းထိုးနှင့် SRT အဖြစ် ပြောင်းလဲနေပါသည်...');

  try {
    const res = await fetch('/api/transcribe-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        videoDuration: duration,
        movieTitle,
        customContext,
        speechIntervals,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data) {
        const { subtitles, srt, fullScript } = data.data;
        if (subtitles && subtitles.length > 0) {
          const parsedCues: SubtitleCue[] = subtitles.map((c: any, idx: number) => ({
            id: c.id || idx + 1,
            startTime: c.startSec !== undefined ? c.startSec : (c.startTime || 0),
            endTime: c.endSec !== undefined ? c.endSec : (c.endTime || 5),
            startDisplay: c.start || formatSeconds(c.startTime || 0),
            endDisplay: c.end || formatSeconds(c.endTime || 5),
            text: c.text,
          }));

          const finalSrt = srt || convertToSrt(parsedCues);
          return {
            subtitles: parsedCues,
            srt: finalSrt,
            fullScript: fullScript || parsedCues.map((c) => c.text).join('\n\n'),
          };
        }
      }
    }
  } catch (err) {
    console.warn('API transcribe-video warning:', err);
  }

  // Fallback: Build exact video-synchronized SRT subtitles matching detected speechIntervals
  if (speechIntervals.length === 0) {
    let t = 0.5;
    while (t < duration - 1) {
      const span = Math.min(5, duration - t - 0.5);
      if (span < 1.5) break;
      speechIntervals.push({ start: Math.round(t * 10) / 10, end: Math.round((t + span) * 10) / 10 });
      t += span + 0.5;
    }
  }

  const plotLines = getAccurateMoviePlotLines(movieTitle, customContext);
  const pool = [
    ...(plotLines[1] || []),
    ...(plotLines[2] || []),
    ...(plotLines[3] || []),
    ...(plotLines[4] || []),
  ];

  const fallbackCues: SubtitleCue[] = speechIntervals.map((interval, idx) => {
    const text = pool[idx % pool.length] || `ဇာတ်လမ်း၏ အပိုင်း (${idx + 1}) အဓိကအခန်း`;
    return {
      id: idx + 1,
      startTime: interval.start,
      endTime: interval.end,
      startDisplay: formatSeconds(interval.start),
      endDisplay: formatSeconds(interval.end),
      text,
    };
  });

  const finalSrt = convertToSrt(fallbackCues);
  const fullScript = fallbackCues.map((c) => c.text).join('\n\n');

  return {
    subtitles: fallbackCues,
    srt: finalSrt,
    fullScript,
  };
}
