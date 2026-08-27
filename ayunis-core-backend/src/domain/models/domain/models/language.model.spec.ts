import { LanguageModel } from './language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

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

  describe('provider fault status', () => {
    it('defaults to false when omitted', () => {
      expect(makeModel({}).hasProviderFault).toBe(false);
    });

    it('preserves an explicit provider fault', () => {
      const model = new LanguageModel({
        name: 'gpt-4o',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4o',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: true,
        isArchived: false,
        hasProviderFault: true,
      });

      expect(model.hasProviderFault).toBe(true);
    });
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
