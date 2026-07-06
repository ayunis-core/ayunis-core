export class SynthesizeSpeechCommand {
  public readonly input: string;

  constructor(params: { input: string }) {
    this.input = params.input;
  }
}
