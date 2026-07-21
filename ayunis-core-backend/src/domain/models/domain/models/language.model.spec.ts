import { LanguageModel } from './language.model';
import { ModelProvider } from '../value-objects/model-provider.enum';

describe('LanguageModel', () => {
  const makeModel = (costs: {
    inputTokenCost?: number;
    outputTokenCost?: number;
  }): LanguageModel =>
    new LanguageModel({
      name: 'model',
      provider: ModelProvider.OPENAI,
      displayName: 'Model',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      isArchived: false,
      inputTokenCost: costs.inputTokenCost,
      outputTokenCost: costs.outputTokenCost,
    });

  describe('consumesCredits', () => {
    it('is false when both token costs are undefined (free open-source model)', () => {
      expect(makeModel({}).consumesCredits).toBe(false);
    });

    it('is false when only one token cost is defined', () => {
      expect(makeModel({ inputTokenCost: 5 }).consumesCredits).toBe(false);
      expect(makeModel({ outputTokenCost: 5 }).consumesCredits).toBe(false);
    });

    it('is false when both token costs are zero', () => {
      expect(
        makeModel({ inputTokenCost: 0, outputTokenCost: 0 }).consumesCredits,
      ).toBe(false);
    });

    it('is true when at least one token cost is greater than zero', () => {
      expect(
        makeModel({ inputTokenCost: 5, outputTokenCost: 0 }).consumesCredits,
      ).toBe(true);
      expect(
        makeModel({ inputTokenCost: 0, outputTokenCost: 15 }).consumesCredits,
      ).toBe(true);
      expect(
        makeModel({ inputTokenCost: 5, outputTokenCost: 15 }).consumesCredits,
      ).toBe(true);
    });
  });
});
