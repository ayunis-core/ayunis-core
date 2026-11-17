export class PresignDownloadCommand {
  constructor(
    public readonly objectName: string,
    public readonly expiresInSeconds: number,
    /**
     * Signing time is floored to this window, so identical commands within
     * one window yield the identical URL. Must be shorter than the expiry; a
     * URL is handed out with between `expiresInSeconds - signingWindowSeconds`
     * and `expiresInSeconds` left.
     */
    public readonly signingWindowSeconds: number,
    public readonly options: {
      contentType?: string;
      fileName?: string;
      bucket?: string;
    } = {},
  ) {}
}
