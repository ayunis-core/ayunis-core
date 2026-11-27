import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermittedLanguageModelResponseDto } from '@ayunis/api-client/schemas';
import { threadRunLifecycle } from '@/features/thread-run';
import {
  renderWithQueryClient,
  serveChatApi,
  type ServedRequest,
} from '@/shared/api/serve-chat-api';
import { ChatStarter } from './ChatStarter';

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/widgets/chat-input/api/useWebResourceMenus', () => ({
  useWebKnowledgeBases: () => undefined,
  useWebIntegrations: () => undefined,
}));

const model = {
  id: 'medium',
  displayName: 'Medium',
  isDefault: true,
} as PermittedLanguageModelResponseDto;

function serveStarter() {
  return serveChatApi({
    'GET /models/permitted/language-models': [model],
    'POST /threads': { id: 'started-thread', sources: [], messages: [] },
  });
}

function createdChat(requests: readonly ServedRequest[]) {
  const created = requests.find(
    ({ method, url }) => method === 'POST' && url === '/threads',
  );
  return created && (JSON.parse(String(created.data)) as unknown);
}

async function sendHello() {
  const input = await screen.findByTestId('input');
  fireEvent.change(input, { target: { value: 'Hello' } });
  await waitFor(() =>
    expect(screen.getByTestId<HTMLButtonElement>('send').disabled).toBe(false),
  );
  fireEvent.click(screen.getByTestId('send'));
}

beforeEach(() => {
  vi.spyOn(threadRunLifecycle, 'startThreadRun').mockImplementation(
    () => undefined,
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChatStarter', () => {
  it('starts a chat in the given workspace and opens it', async () => {
    const requests = serveStarter();
    renderWithQueryClient(<ChatStarter workspaceId="workspace-id" />);

    await sendHello();

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/chats/$threadId',
        params: { threadId: 'started-thread' },
      }),
    );
    expect(createdChat(requests)).toMatchObject({
      modelId: 'medium',
      workspaceId: 'workspace-id',
    });
    expect(createdChat(requests)).not.toHaveProperty('origin');
  });

  it('starts a chat about the given notification outside any workspace', async () => {
    const requests = serveStarter();
    renderWithQueryClient(
      <ChatStarter
        origin={{ kind: 'notification', notificationId: 'notification-id' }}
      />,
    );

    await sendHello();

    await waitFor(() =>
      expect(createdChat(requests)).toMatchObject({
        modelId: 'medium',
        origin: { kind: 'notification', notificationId: 'notification-id' },
      }),
    );
    expect(createdChat(requests)).not.toHaveProperty('workspaceId');
  });
});
