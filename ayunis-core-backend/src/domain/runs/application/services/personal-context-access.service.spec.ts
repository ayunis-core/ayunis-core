import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { RunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';
import { TEST_ORG_ID } from 'src/domain/runs/testing/run-capability.fixture';
import { PersonalContextAccessService } from './personal-context-access.service';

function permit(access: {
  memoryAccess: boolean;
  chatHistoryAccess: boolean;
}): PermittedLanguageModel {
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
    ...access,
  });
}

function resolve(
  options: {
    enabled?: boolean;
    profile?: RunProfileInput;
    isAnonymous?: boolean;
    memoryAccess?: boolean;
    chatHistoryAccess?: boolean;
  } = {},
) {
  const {
    enabled = true,
    profile = { id: 'chat' },
    isAnonymous = false,
    memoryAccess = true,
    chatHistoryAccess = true,
  } = options;
  return new PersonalContextAccessService({
    get: () => enabled,
  } as never).resolve({
    profile,
    isAnonymous,
    permit: permit({ memoryAccess, chatHistoryAccess }),
  });
}

describe('PersonalContextAccessService', () => {
  it.each([
    { memoryAccess: true, chatHistoryAccess: true },
    { memoryAccess: true, chatHistoryAccess: false },
    { memoryAccess: false, chatHistoryAccess: true },
    { memoryAccess: false, chatHistoryAccess: false },
  ])(
    'gives a chat run on a model with memory access $memoryAccess and past-chat access $chatHistoryAccess exactly what its grant allows',
    (access) => {
      expect(resolve(access)).toEqual({
        memory: access.memoryAccess,
        chatHistory: access.chatHistoryAccess,
      });
    },
  );

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
