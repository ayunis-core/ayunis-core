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
  it('gives a chat run memory when its model allows it', () => {
    expect(resolve()).toEqual({ memory: true });
  });

  it('gives no memory on a model whose grant denies it', () => {
    expect(resolve({ memoryAccess: false })).toEqual({ memory: false });
  });

  it('gives an anonymous run no memory, even on a model that allows it', () => {
    expect(resolve({ isAnonymous: true })).toEqual({ memory: false });
  });

  it('gives no memory while the feature is off, whatever the grant says', () => {
    expect(resolve({ enabled: false })).toEqual({ memory: false });
  });

  it.each<RunProfileInput>([
    {
      id: 'routine',
      routine: { name: 'Pressespiegel', internetEnabled: true },
    },
    { id: 'outlook' },
  ])('gives no memory to $id runs', (profile) => {
    expect(resolve({ profile })).toEqual({ memory: false });
  });
});
