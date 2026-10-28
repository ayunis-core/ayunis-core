import { describe, expect, it } from 'vitest';
import type { PiiMaskResponseDto } from '@/shared/api';
import { mergePiiMasks } from './merge-pii-masks';

function mask(overrides: Partial<PiiMaskResponseDto>): PiiMaskResponseDto {
  return {
    id: 'id-1',
    token: '{{pii:PERSON_NAME_1}}',
    value: 'Max Mustermann',
    category: 'person_name',
    unmasked: false,
    ...overrides,
  };
}

describe('mergePiiMasks', () => {
  it('adds new entries and keeps entries missing from the incoming event', () => {
    const kept = mask({ token: '{{pii:LOCATION_1}}', id: 'id-loc' });
    const incoming = mask({});

    const result = mergePiiMasks([kept], [incoming]);

    expect(result).toEqual([kept, incoming]);
  });

  it('replaces existing entries by token', () => {
    const stale = mask({ value: 'old' });
    const fresh = mask({ value: 'new' });

    const result = mergePiiMasks([stale], [fresh]);

    expect(result).toEqual([fresh]);
  });

  it('never regresses unmasked back to masked from a stale event', () => {
    const unmasked = mask({ unmasked: true });
    const stale = mask({ unmasked: false });

    const result = mergePiiMasks([unmasked], [stale]);

    expect(result).toEqual([mask({ unmasked: true })]);
  });

  it('adopts unmasked=true from the incoming event', () => {
    const local = mask({ unmasked: false });
    const incoming = mask({ unmasked: true });

    const result = mergePiiMasks([local], [incoming]);

    expect(result).toEqual([incoming]);
  });
});
