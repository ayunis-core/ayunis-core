import type { SpeechLanguage } from 'src/domain/speech/domain/speech-language';

// One preset voice per language; any preset of the language would do.
// Source: https://docs.mistral.ai/studio/audio/text-to-speech/voices
export const MISTRAL_PRESET_VOICES: Record<SpeechLanguage, string> = {
  arb: 'voice_479', // Maryam
  cat: 'voice_3143', // Jordi
  cmn: 'voice_3142', // Mei
  nld: 'voice_3145', // Lotte
  eng: 'voice_447', // Margaret (US)
  fra: 'voice_592', // Marie
  deu: 'voice_481', // Heidi
  hin: 'voice_3139', // Ananya
  hun: 'voice_3146', // Olivia
  ita: 'voice_482', // Lorenzo
  jpn: 'voice_3133', // Haruto
  kor: 'voice_3136', // Sung
  nob: 'voice_3134', // Lars
  pol: 'voice_3154', // Leon
  por: 'voice_480', // Gabriela
  ron: 'voice_3155', // Irina
  rus: 'voice_3132', // Tatiana
  spa: 'voice_483', // Elena
  tur: 'voice_3138', // Oran
  ukr: 'voice_3140', // Taras
  vie: 'voice_3144', // Huong
};
