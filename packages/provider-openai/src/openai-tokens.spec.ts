import { estimatedTokens } from '@ayunis/inference';
import { describe, expect, it } from 'vitest';

import { openAITokens } from './openai-tokens';

const text = 'Antrag auf Wohngeld für die Gemeinde Musterstadt '.repeat(20);

describe('openAITokens', () => {
  it.each(['gpt-5.6-sol', 'gpt-4o-mini', 'gpt-4.1', 'o3-deployment', 'sol'])(
    'counts %s with o200k_base, exactly, with message framing',
    (model) => {
      const estimator = openAITokens(model);

      expect(estimator).toMatchObject({ exact: true, tokensPerMessage: 3 });
      expect(estimator.countText(text)).not.toBe(
        estimatedTokens().countText(text),
      );
    },
  );

  it.each(['gpt-4-turbo', 'gpt-3.5-turbo'])(
    'counts %s with cl100k_base',
    (model) => {
      expect(openAITokens(model).countText(text)).toBe(
        estimatedTokens().countText(text),
      );
    },
  );
});
