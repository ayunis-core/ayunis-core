import { describe, expect, it } from 'vitest';

import { convertDraft04ExclusiveBoundsNode } from './draft04-compat';

describe('convertDraft04ExclusiveBoundsNode', () => {
  it('leaves modern numeric bounds untouched', () => {
    const node = { type: 'number', exclusiveMinimum: 0, maximum: 10 };
    convertDraft04ExclusiveBoundsNode(node);
    expect(node).toEqual({ type: 'number', exclusiveMinimum: 0, maximum: 10 });
  });

  it('converts a boolean exclusiveMinimum to its numeric form', () => {
    const node = { type: 'number', minimum: 0, exclusiveMinimum: true };
    convertDraft04ExclusiveBoundsNode(node);
    expect(node).toEqual({ type: 'number', exclusiveMinimum: 0 });
  });

  it('converts a boolean exclusiveMaximum to its numeric form', () => {
    const node = { type: 'number', maximum: 10, exclusiveMaximum: true };
    convertDraft04ExclusiveBoundsNode(node);
    expect(node).toEqual({ type: 'number', exclusiveMaximum: 10 });
  });

  it('drops boolean exclusive bounds without a numeric counterpart', () => {
    const node = {
      type: 'number',
      exclusiveMinimum: false,
      exclusiveMaximum: true,
    };
    convertDraft04ExclusiveBoundsNode(node);
    expect(node).toEqual({ type: 'number' });
  });
});
