export abstract class TranscriptionPort {
  abstract transcribe(
    file: Buffer,
    fileName: string,
    mimeType: string,
    language?: string,
  ): Promise<string>;
}
