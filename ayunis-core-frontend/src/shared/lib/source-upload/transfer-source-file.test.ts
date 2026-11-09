import { describe, expect, it } from 'vitest';
import { toSignRequestBody } from './transfer-source-file';

describe('toSignRequestBody', () => {
  it('passes a whole-object PUT through without multipart fields', () => {
    expect(toSignRequestBody({ method: 'PUT' })).toEqual({
      method: 'PUT',
      uploadId: undefined,
      partNumber: undefined,
    });
  });

  it('forwards the multipart upload id and part number', () => {
    expect(
      toSignRequestBody({ method: 'PUT', uploadId: 'mp-1', partNumber: 3 }),
    ).toEqual({ method: 'PUT', uploadId: 'mp-1', partNumber: 3 });
  });
});
