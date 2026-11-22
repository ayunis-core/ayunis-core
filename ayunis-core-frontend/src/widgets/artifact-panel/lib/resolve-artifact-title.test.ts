import { describe, expect, it } from 'vitest';
import { resolveArtifactTitle } from './resolve-artifact-title';

describe('resolveArtifactTitle', () => {
  it('names an exported anonymous artifact with the real values of its own dictionary', () => {
    expect(
      resolveArtifactTitle({
        title: 'Brief an {{pii:PERSON_NAME_1}}',
        piiMasks: [
          {
            token: '{{pii:PERSON_NAME_1}}',
            value: 'Anna Schmidt',
            category: 'person_name',
          },
        ],
      }),
    ).toBe('Brief an Anna Schmidt');
  });
});
