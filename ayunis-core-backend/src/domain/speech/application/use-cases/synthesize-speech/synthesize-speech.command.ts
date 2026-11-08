import type { UiLanguage } from 'src/domain/speech/domain/speech-language';

export class SynthesizeSpeechCommand {
  public readonly text: string;
  public readonly uiLanguage: UiLanguage;
  public readonly signal: AbortSignal;

  constructor(params: {
    text: string;
    uiLanguage: UiLanguage;
    signal: AbortSignal;
  }) {
    this.text = params.text;
    this.uiLanguage = params.uiLanguage;
    this.signal = params.signal;
  }
}
