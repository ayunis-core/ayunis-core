import { LanguageModel } from './models/language.model';
import { PermittedLanguageModel } from './permitted-model.entity';
import { ModelProvider } from './value-objects/model-provider.enum';

const languageModel = new LanguageModel({
  name: 'gpt-5.4',
  provider: ModelProvider.AZURE,
  displayName: 'GPT 5.4',
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: true,
  isArchived: false,
});

describe('PermittedModel', () => {
  it('enables internet access by default', () => {
    const permittedModel = new PermittedLanguageModel({
      model: languageModel,
      orgId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(permittedModel.internetAccessEnabled).toBe(true);
  });

  it('preserves an explicit internet access restriction', () => {
    const permittedModel = new PermittedLanguageModel({
      model: languageModel,
      orgId: '123e4567-e89b-12d3-a456-426614174000',
      internetAccessEnabled: false,
    });

    expect(permittedModel.internetAccessEnabled).toBe(false);
  });
});
