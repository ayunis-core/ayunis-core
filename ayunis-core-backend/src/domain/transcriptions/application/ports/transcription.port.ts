export abstract class TranscriptionPort {
  abstract transcribe(
    file: Buffer,
    fileName: string,
    language?: string,
  ): Promise<string>;
}
