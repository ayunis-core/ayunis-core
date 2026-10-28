import {
  ArtifactExportTimeoutError,
  UnexpectedArtifactError,
} from './artifacts.errors';

describe('UnexpectedArtifactError', () => {
  it('does not expose the caught error in the HTTP response', () => {
    const cause = new Error('database connection string leaked');
    const error = new UnexpectedArtifactError(cause);

    expect(error.cause).toBe(cause);
    expect(error.toHttpException().getResponse()).toEqual({
      code: 'ARTIFACT_UNEXPECTED',
      message: 'Internal server error',
    });
  });
});

describe('ArtifactExportTimeoutError', () => {
  it('returns a classified gateway timeout without exposing the renderer error', () => {
    const cause = new Error('Navigation timeout of 30000 ms exceeded');
    const error = new ArtifactExportTimeoutError(cause);

    expect(error.cause).toBe(cause);
    expect(error.toHttpException().getStatus()).toBe(504);
    expect(error.toHttpException().getResponse()).toEqual({
      code: 'ARTIFACT_EXPORT_TIMEOUT',
      message: 'Internal server error',
    });
  });
});
