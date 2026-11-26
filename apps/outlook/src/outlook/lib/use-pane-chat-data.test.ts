import { describe, expect, it } from 'vitest';
import { resolvePaneDocumentAttachments } from './use-pane-chat-data';

describe(resolvePaneDocumentAttachments.name, () => {
  it('delegates document readiness to the upload endpoint without models:read', () => {
    expect(
      resolvePaneDocumentAttachments(
        { fileUpload: true, modelSelection: false },
        undefined,
      ),
    ).toBe(true);
  });

  it.each([
    { embeddingEnabled: undefined, expected: false },
    { embeddingEnabled: false, expected: false },
    { embeddingEnabled: true, expected: true },
  ])(
    'returns $expected when readable embedding status is $embeddingEnabled',
    ({ embeddingEnabled, expected }) => {
      expect(
        resolvePaneDocumentAttachments(
          { fileUpload: true, modelSelection: true },
          embeddingEnabled,
        ),
      ).toBe(expected);
    },
  );

  it('keeps documents disabled without upload permission', () => {
    expect(
      resolvePaneDocumentAttachments(
        { fileUpload: false, modelSelection: false },
        undefined,
      ),
    ).toBe(false);
  });
});
