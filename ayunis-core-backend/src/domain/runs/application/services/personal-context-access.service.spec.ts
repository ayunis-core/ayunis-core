import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { RunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';
import { TEST_ORG_ID } from 'src/domain/runs/testing/run-capability.fixture';
import { PersonalContextAccessService } from './personal-context-access.service';

function permit(memoryAccess: boolean): PermittedLanguageModel {
  return new PermittedLanguageModel({
    model: new LanguageModel({
      name: 'mistral-large',
      displayName: 'Mistral Large',
      provider: ModelProvider.MISTRAL,
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      isArchived: false,
      canVision: false,
      contextWindowSize: 128_000,
    }),
    orgId: TEST_ORG_ID,
    memoryAccess,
  });
}

function resolve(
  options: {
    enabled?: boolean;
    profile?: RunProfileInput;
    isAnonymous?: boolean;
    memoryAccess?: boolean;
  } = {},
) {
  const {
    enabled = true,
    profile = { id: 'chat' },
    isAnonymous = false,
    memoryAccess = true,
  } = options;
  return new PersonalContextAccessService({
    get: () => enabled,
  } as never).resolve({ profile, isAnonymous, permit: permit(memoryAccess) });
}

describe('PersonalContextAccessService', () => {
  it('gives a chat run memory and chat history when its model allows memory', () => {
    expect(resolve()).toEqual({ memory: true, chatHistory: true });
  });

  it('gives no memory on a model whose grant denies it, but still chat history', () => {
    expect(resolve({ memoryAccess: false })).toEqual({
      memory: false,
      chatHistory: true,
    });
  });

  it('gives an anonymous run no personal context, even on a model that allows it', () => {
    expect(resolve({ isAnonymous: true })).toEqual({
      memory: false,
      chatHistory: false,
    });
  });

  it('gives no personal context while the feature is off, whatever the grant says', () => {
    expect(resolve({ enabled: false })).toEqual({
      memory: false,
      chatHistory: false,
    });
  });

  it.each<RunProfileInput>([
    {
      id: 'routine',
      routine: { name: 'Pressespiegel', internetEnabled: true },
    },
    { id: 'outlook' },
  ])('gives $id runs no personal context', (profile) => {
    expect(resolve({ profile })).toEqual({
      memory: false,
      chatHistory: false,
    });
  });
});
