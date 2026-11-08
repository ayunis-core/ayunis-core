/**
 * Languages that read-aloud can speak with a matching preset voice, as ISO
 * 639-3 codes. Norwegian is `nob` for both written standards.
 */
export const SPEECH_LANGUAGES = [
  'arb',
  'cat',
  'cmn',
  'nld',
  'eng',
  'fra',
  'deu',
  'hin',
  'hun',
  'ita',
  'jpn',
  'kor',
  'nob',
  'pol',
  'por',
  'ron',
  'rus',
  'spa',
  'tur',
  'ukr',
  'vie',
] as const;

export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number];

export const UI_LANGUAGES = ['de', 'en'] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];
