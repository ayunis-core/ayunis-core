import { randomUUID } from 'crypto';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import {
  ArtifactExpectedVersionMismatchError,
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

describe('ArtifactExpectedVersionMismatchError', () => {
  it.each([
    [ArtifactType.DOCUMENT, 'read_document'],
    [ArtifactType.DIAGRAM, 'read_diagram'],
    [ArtifactType.SPREADSHEET, 'read_spreadsheet'],
  ])(
    'tells the model to recover a stale %s write with %s, the read tool that can read it',
    (type, readTool) => {
      const error = new ArtifactExpectedVersionMismatchError(
        { id: randomUUID(), type },
        2,
        4,
      );

      expect(error.message).toContain(`Use ${readTool} `);
      expect(error.message).toContain(`the ${type} is at version 4`);
    },
  );
});
