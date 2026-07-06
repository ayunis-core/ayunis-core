export abstract class TextToSpeechPort {
  abstract synthesize(input: string): Promise<Buffer>;
}
