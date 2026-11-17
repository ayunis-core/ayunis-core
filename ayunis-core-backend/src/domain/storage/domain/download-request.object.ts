/**
 * A GET for one object, signed for whoever holds the URL. The response type
 * and filename are signed in, so the holder cannot change them.
 */
export interface DownloadRequest {
  signedAt: Date;
  expiresInSeconds: number;
  contentType?: string;
  fileName?: string;
}
