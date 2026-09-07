import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractErrorData: vi.fn(),
  getEffectiveDefaultModel: vi.fn(),
  getSystemPrompt: vi.fn(),
  hasActiveSubscription: vi.fn(),
  isEmbeddingModelEnabled: vi.fn(),
}));

vi.mock('@/pages/new-chat', () => ({
  NewChatPage: () => null,
  NewChatPageNoModelError: () => null,
}));
vi.mock('@/shared/api', () => ({
  chatSettingsControllerGetSystemPrompt: mocks.getSystemPrompt,
  getChatSettingsControllerGetSystemPromptQueryKey: () => ['system-prompt'],
  getModelsControllerIsEmbeddingModelEnabledQueryKey: () => [
    'embedding-model-enabled',
  ],
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey: () => [
    'effective-default-model',
  ],
  getSubscriptionsControllerHasActiveSubscriptionQueryKey: () => [
    'active-subscription',
  ],
  modelsControllerIsEmbeddingModelEnabled: mocks.isEmbeddingModelEnabled,
  modelsDefaultsControllerGetEffectiveDefaultModel:
    mocks.getEffectiveDefaultModel,
  subscriptionsControllerHasActiveSubscription: mocks.hasActiveSubscription,
}));
vi.mock('@/shared/api/extract-error-data', () => ({
  default: mocks.extractErrorData,
}));

const { Route } = await import('./chat.index');

interface LoaderResult {
  selectedModelId?: string;
}

function appQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
}

async function runLoader(queryClient: QueryClient): Promise<LoaderResult> {
  const loader = Route.options.loader as (args: {
    deps: { modelId?: string };
    context: { queryClient: QueryClient };
  }) => Promise<LoaderResult>;

  return loader({ deps: {}, context: { queryClient } });
}

describe('new chat route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractErrorData.mockImplementation((error: unknown) => {
      throw error;
    });
    mocks.getEffectiveDefaultModel.mockResolvedValue({
      permittedLanguageModel: { id: 'sol' },
    });
    mocks.getSystemPrompt.mockResolvedValue({});
    mocks.hasActiveSubscription.mockResolvedValue({
      hasActiveSubscription: true,
    });
    mocks.isEmbeddingModelEnabled.mockResolvedValue({
      isEmbeddingModelEnabled: true,
    });
  });

  it('loads the current default instead of trusting a fresh cached value', async () => {
    const queryClient = appQueryClient();
    queryClient.setQueryData(['effective-default-model'], {
      permittedLanguageModel: { id: 'terra' },
    });

    const result = await runLoader(queryClient);

    expect(result.selectedModelId).toBe('sol');
    expect(mocks.getEffectiveDefaultModel).toHaveBeenCalledOnce();
  });

  it('renders without a preselected model when the default cannot be loaded', async () => {
    mocks.getEffectiveDefaultModel.mockRejectedValue(new Error('offline'));

    const result = await runLoader(appQueryClient());

    expect(result.selectedModelId).toBeUndefined();
  });

  it('preserves the no-default-model error for the route error page', async () => {
    const error = new Error('no default model');
    mocks.getEffectiveDefaultModel.mockRejectedValue(error);
    mocks.extractErrorData.mockReturnValue({ code: 'NO_DEFAULT_MODEL_FOUND' });

    await expect(runLoader(appQueryClient())).rejects.toBe(error);
  });
});
