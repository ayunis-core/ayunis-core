import { describe, expect, it } from 'vitest';
import { resolveModelErrorToastKey } from './resolveModelErrorToastKey';

describe('resolveModelErrorToastKey', () => {
  it.each([
    ['MODEL_ALREADY_EXISTS', 'models.alreadyExists'],
    ['MODEL_NOT_FOUND', 'models.notFound'],
    ['MODEL_INVALID', 'models.invalid'],
    ['VALIDATION_ERROR', 'models.invalid'],
    ['MODEL_PROVIDER_NOT_SUPPORTED', 'models.providerNotSupported'],
    [
      'IMAGE_GENERATION_MODEL_PROVIDER_NOT_SUPPORTED',
      'models.imageGenerationProviderNotSupported',
    ],
    ['MODEL_CREATION_FAILED', 'models.createError'],
    ['MODEL_UPDATE_FAILED', 'models.updateError'],
    ['MODEL_DELETION_FAILED', 'models.deleteError'],
    ['MODEL_REFERENCED_BY_USAGE', 'models.referencedByUsage'],
    ['MODEL_STILL_PERMITTED', 'models.stillPermitted'],
  ])('maps %s to %s', (code, expectedKey) => {
    expect(resolveModelErrorToastKey(code, 'models.updateError')).toBe(
      expectedKey,
    );
  });

  it('uses the operation fallback for an unknown error code', () => {
    expect(
      resolveModelErrorToastKey('UNEXPECTED_MODEL_ERROR', 'models.deleteError'),
    ).toBe('models.deleteError');
  });
});
