/**
 * Test-only shim for '@mistralai/mistralai/models/errors'.
 *
 * The v2 SDK is ESM-only; Jest's CommonJS runtime cannot parse its build and
 * ts-jest only transforms .ts files. jest's moduleNameMapper points the
 * subpath here so specs and services under test share the same classes
 * (instanceof stays consistent). Mirrors esm/models/errors/mistralerror.js —
 * keep the constructor signature and fields in sync when upgrading the SDK.
 */
export class MistralError extends Error {
  readonly statusCode: number;
  readonly body: string;
  readonly headers: Headers;
  readonly contentType: string;
  readonly rawResponse: Response;

  constructor(
    message: string,
    httpMeta: { response: Response; request: Request; body: string },
  ) {
    super(message);
    this.statusCode = httpMeta.response.status;
    this.body = httpMeta.body;
    this.headers = httpMeta.response.headers;
    this.contentType = httpMeta.response.headers.get('content-type') || '';
    this.rawResponse = httpMeta.response;
    this.name = 'MistralError';
  }
}

export class SDKError extends MistralError {
  constructor(
    message: string,
    httpMeta: { response: Response; request: Request; body: string },
  ) {
    super(message, httpMeta);
    this.name = 'SDKError';
  }
}
