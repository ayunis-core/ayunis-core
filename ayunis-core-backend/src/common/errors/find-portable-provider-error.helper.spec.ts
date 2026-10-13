import { ModelProviderError } from '@ayunis/inference';
import { findPortableProviderError } from './find-portable-provider-error.helper';

const portableError = () =>
  new ModelProviderError({
    kind: 'rejection',
    stage: 'stream_establishment',
    cause: new Error('provider rejection'),
  });
it('finds the original provider error through wrappers', () => {
  const error = portableError();
  expect(
    findPortableProviderError(
      new Error('wrapper', { cause: new Error('inner', { cause: error }) }),
    ),
  ).toBe(error);
});
it('terminates when a cause chain cycles', () => {
  const error: { cause?: unknown } = {};
  error.cause = error;
  expect(findPortableProviderError(error)).toBeUndefined();
});
it('bounds traversal of deeply nested causes', () => {
  let error: unknown = portableError();
  for (let index = 0; index < 30; index++)
    error = new Error('wrapper', { cause: error });
  expect(findPortableProviderError(error)).toBeUndefined();
});
