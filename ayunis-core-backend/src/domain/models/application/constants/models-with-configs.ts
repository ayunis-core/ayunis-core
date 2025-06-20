import { Model } from '../../domain/model.entity';
import { ModelConfig } from '../../domain/model-config.entity';
import { ModelProvider } from '../../domain/value-objects/model-provider.object';
import { ModelWithConfig } from '../../domain/model-with-config.entity';

export const ALL_MODELS: Array<ModelWithConfig> = [
  // OPENAI MODELS
  {
    model: new Model('gpt-4.1', ModelProvider.OPENAI),
    config: new ModelConfig({
      displayName: 'GPT-4.1',
      canStream: true,
      isReasoning: false,
      isArchived: false,
    }),
  },
  // {
  //   model: new Model('gpt-4o', ModelProvider.OPENAI),
  //   config: new ModelConfig({
  //     displayName: 'GPT-4o',
  //     canStream: true,
  //     isReasoning: true,
  //     isArchived: false,
  //   }),
  // },
  // {
  //   model: new Model('o4-mini-2025-04-16', ModelProvider.OPENAI),
  //   config: new ModelConfig({
  //     displayName: 'GPT-o4-mini',
  //     canStream: true,
  //     isReasoning: true,
  //     isArchived: false,
  //   }),
  // },

  // ANTHROPIC MODELS
  {
    model: new Model('claude-sonnet-4-20250514', ModelProvider.ANTHROPIC),
    config: new ModelConfig({
      displayName: 'Claude Sonnet 4',
      canStream: true,
      isReasoning: false,
      isArchived: false,
    }),
  },
  {
    model: new Model('claude-3-7-sonnet-latest', ModelProvider.ANTHROPIC),
    config: new ModelConfig({
      displayName: 'Claude 3.7 Sonnet',
      canStream: true,
      isReasoning: false,
      isArchived: false,
    }),
  },

  // MISTRAL MODELS
  // {
  //   model: new Model('magistral-medium-2506', ModelProvider.MISTRAL),
  //   config: new ModelConfig({
  //     displayName: 'Magistral Medium',
  //     canStream: true,
  //     isReasoning: true,
  //     isArchived: false,
  //   }),
  // },
  {
    model: new Model('mistral-large-latest', ModelProvider.MISTRAL),
    config: new ModelConfig({
      displayName: 'Mistral Large',
      canStream: true,
      isReasoning: false,
      isArchived: false,
    }),
  },
  // {
  //   model: new Model('codestral-latest', ModelProvider.MISTRAL),
  //   config: new ModelConfig({
  //     displayName: 'Codestral',
  //     canStream: true,
  //     isReasoning: true,
  //     isArchived: false,
  //   }),
  // },
];
