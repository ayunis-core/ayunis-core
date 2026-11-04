/** A multipart upload that was initiated but never completed or aborted. */
export interface IncompleteUpload {
  objectName: string;
  uploadId: string;
}

export type UploadRequestMethod = 'PUT' | 'POST' | 'GET' | 'DELETE';

/**
 * One S3 request a browser may send for an object: a whole-object PUT, or a
 * step of a multipart upload (create, upload part, list parts, complete,
 * abort), identified by its method and query parameters.
 */
export interface UploadRequest {
  method: UploadRequestMethod;
  query: Record<string, string>;
  contentLength?: number;
}
