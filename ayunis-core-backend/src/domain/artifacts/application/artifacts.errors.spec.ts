import { UnexpectedArtifactError } from './artifacts.errors';

describe('UnexpectedArtifactError', () => {
  it('does not expose the caught error in the HTTP response', () => {
    const cause = new Error('database connection string leaked');
    const error = new UnexpectedArtifactError(cause);

    expect(error.cause).toBe(cause);
    expect(error.toHttpException().getResponse()).toEqual({
      code: 'ARTIFACT_UNEXPECTED',
      message: 'Unexpected artifact error',
    });
  });
});
