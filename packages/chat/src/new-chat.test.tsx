import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { ChatViewConfig } from './chat-config';
import { NewChat } from './new-chat';
import { createChatRunLifecycle } from './run-lifecycle';

interface ServedConfig {
  readonly method: string;
  readonly url: string;
  readonly data?: unknown;
}

const mocks = vi.hoisted(() => ({
  request: vi.fn<(config: ServedConfig) => Promise<unknown>>(),
}));
vi.mock('@ayunis/api-client/request', () => ({
  customAxiosInstance: mocks.request,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const model = {
  id: 'model-1',
  displayName: 'Municipal model',
  isDefault: true,
  canVision: true,
};

const API: Record<string, unknown> = {
  'GET /models/permitted/language-models': [model],
  'GET /models/modes': [
    {
      mode: 'auto',
      permittedModelId: model.id,
      anonymousPermittedModelId: model.id,
    },
  ],
  'GET /feature-toggles': {},
  'GET /academy-access/status': { allowed: true },
  'GET /models/embedding/enabled': { isEmbeddingModelEnabled: false },
  'GET /models/default-selection': { mode: null, permittedModelId: model.id },
  'GET /chat-settings/chat-start-defaults': { anonymousModeByDefault: false },
  'POST /threads': { id: 'thread-1', sources: [], messages: [] },
};

let pendingCreation = false;

function requested(method: string, url: string) {
  return mocks.request.mock.calls
    .map(([config]) => config)
    .filter((config) => config.method === method && config.url === url);
}

function createdChat() {
  return requested('POST', '/threads')[0]?.data as Record<string, unknown>;
}

function renderNewChat(config: Partial<ChatViewConfig> = {}) {
  const lifecycle = createChatRunLifecycle({
    send: () => Promise.resolve(new Response('')),
  });
  vi.spyOn(lifecycle, 'startThreadRun').mockImplementation(() => undefined);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <NewChat
      config={{
        sessionKey: 'user-1',
        transport: { send: vi.fn() },
        layout: 'page',
        events: { onNewChat: vi.fn() },
        ...config,
      }}
      content={{ greeting: { title: 'Guten Morgen' }, starterPrompts: [] }}
      lifecycle={lifecycle}
    />,
    { wrapper },
  );
}

async function composerReady() {
  await waitFor(() =>
    expect(screen.getByTestId('chat-model-selector').textContent).toContain(
      model.displayName,
    ),
  );
}

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.clearAllMocks();
  pendingCreation = false;
  mocks.request.mockImplementation(({ method, url }) => {
    const key = `${method} ${url}`;
    if (key === 'POST /threads' && pendingCreation) {
      return new Promise(() => undefined);
    }
    return key in API
      ? Promise.resolve(API[key])
      : Promise.reject(new Error(`Not served: ${key}`));
  });
});

describe('NewChat', () => {
  it('shows no surface-specific feature and requests nothing for it without its data', async () => {
    renderNewChat();
    await composerReady();

    expect(screen.queryByTestId('new-chat-workspace-picker')).toBeNull();
    expect(screen.queryByTestId('new-chat-onboarding-hint')).toBeNull();
    expect(screen.queryByTestId('new-chat-unread-notifications')).toBeNull();
    expect(screen.queryByRole('button', { name: /pinnedSkills/ })).toBeNull();
    const urls = mocks.request.mock.calls.map(([config]) => config.url);
    expect(
      urls.filter((url) =>
        /notifications|release-notes|onboarding|skills|workspaces/.test(url),
      ),
    ).toEqual([]);
  });

  it('removes the workspace picker as soon as the start begins, so the workspace cannot change', async () => {
    pendingCreation = true;
    renderNewChat({
      workspaces: {
        items: [],
        selected: 'workspace-1',
        select: vi.fn(),
        moveThread: vi.fn(),
        create: vi.fn(),
      },
    });
    await composerReady();
    expect(screen.getByTestId('new-chat-workspace-picker')).toBeTruthy();

    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'Hallo' },
    });
    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() =>
      expect(screen.queryByTestId('new-chat-workspace-picker')).toBeNull(),
    );
    expect(createdChat()).toMatchObject({ workspaceId: 'workspace-1' });
  });

  it('starts a non-anonymous profile chat on the stage model, whatever the composer selected', async () => {
    renderNewChat({
      onboarding: { hint: { stage: 'profile', modelId: 'memory-model' } },
    });
    await composerReady();
    fireEvent.click(screen.getByTestId('chat-anonymous-toggle'));

    fireEvent.click(screen.getByTestId('new-chat-onboarding-hint'));

    await waitFor(() => expect(requested('POST', '/threads')).toHaveLength(1));
    expect(createdChat()).toEqual({
      modelId: 'memory-model',
      isAnonymous: false,
      origin: { kind: 'onboarding', stage: 'profile' },
    });
  });

  it('starts a first-skill chat with the composer model and anonymous mode', async () => {
    renderNewChat({
      onboarding: { hint: { stage: 'first_skill', modelId: null } },
    });
    await composerReady();
    fireEvent.click(screen.getByTestId('chat-anonymous-toggle'));

    fireEvent.click(screen.getByTestId('new-chat-onboarding-hint'));

    await waitFor(() => expect(requested('POST', '/threads')).toHaveLength(1));
    expect(createdChat()).toEqual({
      modelId: model.id,
      isAnonymous: true,
      origin: { kind: 'onboarding', stage: 'first_skill' },
    });
  });
});
