import { OpenAIModelMapper } from './openai-model.mapper';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

describe('OpenAIModelMapper', () => {
  const mapper = new OpenAIModelMapper();

  const buildModel = (
    overrides?: Partial<ConstructorParameters<typeof LanguageModel>[0]>,
  ): LanguageModel =>
    new LanguageModel({
      name: 'gpt-4o',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4o',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      isArchived: false,
      ...overrides,
    });

  describe('toModelObject', () => {
    it('maps name, provider, and createdAt to the OpenAI model shape', () => {
      const createdAt = new Date('2025-06-01T12:00:00.500Z');
      const result = mapper.toModelObject(buildModel({ createdAt }));

      expect(result).toEqual({
        id: 'gpt-4o',
        object: 'model',
        created: Math.floor(createdAt.getTime() / 1000),
        owned_by: ModelProvider.OPENAI,
      });
    });
  });

  describe('toListResponse', () => {
    it('wraps mapped models in an OpenAI list envelope', () => {
      const result = mapper.toListResponse([
        buildModel(),
        buildModel({
          name: 'claude-sonnet',
          provider: ModelProvider.ANTHROPIC,
        }),
      ]);

      expect(result.object).toBe('list');
      expect(result.data.map((m) => m.id)).toEqual(['gpt-4o', 'claude-sonnet']);
      expect(result.data.every((m) => m.object === 'model')).toBe(true);
    });

    it('returns an empty data array for no models', () => {
      expect(mapper.toListResponse([])).toEqual({ object: 'list', data: [] });
    });
  });
});
