import { Command, CommandRunner } from 'nest-commander';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

function ensureNonProduction() {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error('Seeding is disabled in production');
  }
}

@Command({ name: 'seed:models', description: 'Seed models only' })
export class SeedModelsCommand extends CommandRunner {
  constructor(private readonly modelsRepo: ModelsRepository) {
    super();
  }

  async run(): Promise<void> {
    ensureNonProduction();

    const ensure = async (
      name: string,
      displayName: string,
      provider: ModelProvider,
      canStream = true,
    ) => {
      const existing = await this.modelsRepo.findOne({ name, provider });
      if (existing) return;
      const lm = new LanguageModel({
        name,
        provider,
        displayName,
        canStream,
        isReasoning: false,
        isArchived: false,
      });
      await this.modelsRepo.save(lm);
    };

    await ensure('gpt-4o-mini', 'GPT-4o mini', ModelProvider.OPENAI);
    await ensure('mistral-small', 'Mistral Small', ModelProvider.MISTRAL);
  }
}
