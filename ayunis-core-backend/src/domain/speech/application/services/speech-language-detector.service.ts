import { Injectable } from '@nestjs/common';
import { francAll } from 'franc-all';
import {
  SPEECH_LANGUAGES,
  type SpeechLanguage,
  type UiLanguage,
} from 'src/domain/speech/domain/speech-language';

// Languages Mistral TTS speaks but has no preset voice for. They stay in the
// candidate set so such text is recognised (and falls back) instead of being
// pinned on the closest voiced neighbour, e.g. Swedish on Norwegian.
const LANGUAGES_WITHOUT_VOICE = [
  'bul',
  'ces',
  'dan',
  'ell',
  'fin',
  'hrv',
  'ind',
  'isl',
  'ltz',
  'lvs',
  'slk',
  'slv',
  'swe',
  'tam',
  'tgl',
  'tha',
  'urd',
];

// Restricting franc to these keeps it from picking related minor languages
// (Scots for English, Bosnian for Croatian).
const CANDIDATES = [...SPEECH_LANGUAGES, 'nno', ...LANGUAGES_WITHOUT_VOICE];

// Below this length franc's trigram guesses are unreliable: "Sure, here you
// go." scores Turkish above English.
const MIN_DETECTABLE_LENGTH = 30;
const UNCERTAIN_RUNNER_UP_SCORE = 0.98;

const UI_LANGUAGE_VOICES: Record<UiLanguage, SpeechLanguage> = {
  de: 'deu',
  en: 'eng',
};

@Injectable()
export class SpeechLanguageDetectorService {
  detect(text: string, uiLanguage: UiLanguage): SpeechLanguage {
    const fallback = UI_LANGUAGE_VOICES[uiLanguage];
    if (text.trim().length < MIN_DETECTABLE_LENGTH) return fallback;

    const ranked = rankLanguages(text);
    const best = ranked.at(0);
    const runnerUp = ranked.at(1);
    if (!best || (runnerUp && runnerUp.score >= UNCERTAIN_RUNNER_UP_SCORE)) {
      return fallback;
    }
    return toSpeechLanguage(best.code) ?? fallback;
  }
}

function rankLanguages(text: string): { code: string; score: number }[] {
  const ranked = new Map<string, number>();
  const results = francAll(text, {
    only: CANDIDATES,
    minLength: MIN_DETECTABLE_LENGTH,
  });
  for (const [code, score] of results) {
    if (code === 'und') continue;
    const language = code === 'nno' ? 'nob' : code;
    if (!ranked.has(language)) ranked.set(language, score);
  }
  return [...ranked].map(([code, score]) => ({ code, score }));
}

function toSpeechLanguage(code: string): SpeechLanguage | undefined {
  return SPEECH_LANGUAGES.find((language) => language === code);
}
