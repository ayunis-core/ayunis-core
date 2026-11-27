import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ComposerExports from '@ayunis/chat/composer';
import type { PermittedLanguageModelResponseDto } from '@ayunis/api-client/schemas';
import { toast } from '@ayunis/ui/lib/toast';
import {
  Conversation,
  NewChatComposer,
  type ChatKnowledgeBases,
  type NewChatComposerProps,
} from '@ayunis/chat/surface';
import { createChatRunLifecycle } from '@ayunis/chat/runs';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_TOTAL_IMAGE_SIZE_BYTES,
} from '@ayunis/chat/composer';
import {
  renderWithQueryClient,
  serveChatApi,
  type ServedRequest,
} from '@/shared/api/serve-chat-api';

const voiceRecorder = vi.hoisted(() => ({
  errorKey: undefined as string | undefined,
}));

vi.mock('@ayunis/ui/lib/toast', () => ({ toast: { error: vi.fn() } }));
vi.mock('@ayunis/chat/composer', async (importOriginal) => {
  const actual = await importOriginal<typeof ComposerExports>();
  return {
    ...actual,
    useVoiceRecording: (
      onTranscript: (text: string) => void,
      onError: (key: string) => void,
    ) => ({
      isStarting: false,
      isRecording: false,
      isTranscribing: false,
      isSupported: true,
      startRecording: async () => {
        if (voiceRecorder.errorKey) onError(voiceRecorder.errorKey);
        else onTranscript('Bitte Antrag prüfen');
      },
      stopRecording: vi.fn(),
    }),
  };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const municipalModel = {
  id: 'municipal-model',
  modelId: 'catalog-municipal',
  name: 'municipal',
  provider: 'mistral',
  displayName: 'Municipal model',
  canVision: true,
  isDefault: true,
} as PermittedLanguageModelResponseDto;

const startedThread = { id: 'started-thread', sources: [], messages: [] };

function serveComposer(routes: Parameters<typeof serveChatApi>[0] = {}) {
  return serveChatApi({
    'GET /models/permitted/language-models': [municipalModel],
    'GET /models/default-selection': {
      mode: null,
      permittedModelId: municipalModel.id,
    },
    'GET /feature-toggles': { voiceEnabled: true },
    'POST /threads': startedThread,
    ...routes,
  });
}

/** Renders the composer of a chat to start; `starts` lists the first messages it handed off. */
function mountComposer(props: Partial<NewChatComposerProps> = {}) {
  const lifecycle = createChatRunLifecycle({
    send: () => Promise.resolve(new Response('')),
  });
  const handOff = vi
    .spyOn(lifecycle, 'startThreadRun')
    .mockImplementation(() => undefined);
  const view = renderWithQueryClient(
    <NewChatComposer
      config={{ layout: 'page', events: { onNewChat: vi.fn() } }}
      lifecycle={lifecycle}
      {...props}
    />,
  );
  const starts = () => handOff.mock.calls.map(([run]) => run);
  return { ...view, starts };
}

async function renderComposer(props: Partial<NewChatComposerProps> = {}) {
  const composer = mountComposer(props);
  await waitFor(() =>
    expect(screen.getByTestId('chat-model-selector').textContent).toContain(
      municipalModel.displayName,
    ),
  );
  return composer;
}

function send(text: string) {
  fireEvent.change(screen.getByTestId('input'), { target: { value: text } });
  fireEvent.click(screen.getByTestId('send'));
}

/** What the chat the composer started was created with. */
function createdChats(requests: readonly ServedRequest[]) {
  return requests
    .filter(({ method, url }) => method === 'POST' && url === '/threads')
    .map(({ data }) => JSON.parse(String(data)) as Record<string, unknown>);
}

function oversizedImage(): File {
  const file = new File([''], 'permit-scan.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: MAX_IMAGE_SIZE_BYTES + 1 });
  return file;
}

function imageOfSize(size: number): File {
  const file = new File([''], 'site-photo.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function requestsTo(requests: readonly ServedRequest[], url: string) {
  return requests.filter((request) => request.url === url);
}

beforeEach(() => {
  vi.clearAllMocks();
  voiceRecorder.errorKey = undefined;
  vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });
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
  vi.unstubAllGlobals();
});

describe('composer image rejection', () => {
  it('notifies when an oversized image is selected', async () => {
    serveComposer();
    await renderComposer();
    fireEvent.change(screen.getByTestId('chat-file-upload-input'), {
      target: { files: [oversizedImage()] },
    });
    expect(toast.error).toHaveBeenCalledWith(
      'chatInput.imageTooLarge',
      expect.anything(),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('notifies when an oversized image is dropped', async () => {
    serveComposer();
    await renderComposer();
    fireEvent.drop(screen.getByTestId('chat-input'), {
      dataTransfer: { files: [oversizedImage()] },
    });
    expect(toast.error).toHaveBeenCalledWith(
      'chatInput.imageTooLarge',
      expect.anything(),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('notifies when selected images exceed the per-message total', async () => {
    serveComposer();
    await renderComposer();
    const count = MAX_TOTAL_IMAGE_SIZE_BYTES / MAX_IMAGE_SIZE_BYTES + 1;
    fireEvent.change(screen.getByTestId('chat-file-upload-input'), {
      target: {
        files: Array.from({ length: count }, () =>
          imageOfSize(MAX_IMAGE_SIZE_BYTES),
        ),
      },
    });
    expect(toast.error).toHaveBeenCalledWith(
      'chatInput.imageTotalTooLarge',
      expect.anything(),
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(count - 1);
  });

  it('notifies when an oversized image is pasted', async () => {
    serveComposer();
    await renderComposer();
    const file = oversizedImage();
    fireEvent.focus(screen.getByTestId('input'));
    fireEvent.paste(screen.getByTestId('input'), {
      clipboardData: {
        getData: () => '',
        items: [{ type: 'image/png', getAsFile: () => file }],
      },
    });
    expect(toast.error).toHaveBeenCalledWith(
      'chatInput.imageTooLarge',
      expect.anything(),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('composer attachment selection', () => {
  const textModel = { ...municipalModel, canVision: false };

  it('queues a document but skips an image when the model cannot use images', async () => {
    serveComposer({
      'GET /models/permitted/language-models': [textModel],
      'GET /models/embedding/enabled': { isEmbeddingModelEnabled: true },
    });
    await renderComposer();
    const picker = screen.getByTestId('chat-file-upload-input');
    await waitFor(() =>
      expect(picker.getAttribute('accept')).not.toBe('image/*'),
    );

    fireEvent.change(picker, {
      target: {
        files: [
          new File(['sample'], 'notes.txt', { type: 'text/plain' }),
          new File(['sample'], 'screen.png', { type: 'image/png' }),
        ],
      },
    });

    expect(await screen.findByText('notes.txt')).toBeTruthy();
    expect(screen.queryByAltText('screen.png')).toBeNull();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('accepts only images while no embedding model is enabled', async () => {
    serveComposer();
    await renderComposer();
    const picker = screen.getByTestId<HTMLInputElement>(
      'chat-file-upload-input',
    );
    expect(picker.accept).toBe('image/*');

    fireEvent.change(picker, {
      target: {
        files: [
          new File(['sample'], 'notes.txt', { type: 'text/plain' }),
          new File(['sample'], 'screen.png', { type: 'image/png' }),
        ],
      },
    });

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(screen.queryByText('notes.txt')).toBeNull();
    expect(toast.error).toHaveBeenCalledOnce();
  });
});

describe('composer while a start is in flight', () => {
  function holdCreation() {
    return serveComposer({
      'POST /threads': () => new Promise(() => undefined),
    });
  }

  it('ignores Send, so a waiting message is not replaced', async () => {
    const requests = holdCreation();
    await renderComposer();
    send('Bitte Antrag prüfen');
    await waitFor(() => expect(createdChats(requests)).toHaveLength(1));

    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'Noch eine Frage' },
    });
    fireEvent.keyDown(screen.getByTestId('input'), { key: 'Enter' });

    expect(createdChats(requests)).toHaveLength(1);
  });

  it('offers cancellation, which starts nothing', async () => {
    holdCreation();
    const { starts } = await renderComposer();
    send('Bitte Antrag prüfen');

    fireEvent.click(await screen.findByTestId('cancel'));

    await waitFor(() => expect(screen.queryByTestId('cancel')).toBeNull());
    expect(starts()).toHaveLength(0);
  });
});

describe('composer voice input', () => {
  async function renderWithSend() {
    serveComposer();
    const { starts } = await renderComposer();
    const voiceInputOfSend = async () => {
      fireEvent.click(screen.getByTestId('send'));
      await waitFor(() => expect(starts()).toHaveLength(1));
      return starts()[0]?.voiceInput;
    };
    return { input: screen.getByTestId('input'), voiceInputOfSend };
  }

  it('reports a prompt with dictated text as voice input', async () => {
    const { voiceInputOfSend } = await renderWithSend();

    fireEvent.click(screen.getByTestId('chat-input-microphone'));

    expect(await voiceInputOfSend()).toBe(true);
  });

  it('does not report a typed prompt as voice input', async () => {
    const { input, voiceInputOfSend } = await renderWithSend();

    fireEvent.change(input, { target: { value: 'Bitte Antrag prüfen' } });

    expect(await voiceInputOfSend()).toBe(false);
  });

  it('forgets dictated text once the prompt was cleared', async () => {
    const { input, voiceInputOfSend } = await renderWithSend();

    fireEvent.click(screen.getByTestId('chat-input-microphone'));
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 'Bitte Antrag prüfen' } });

    expect(await voiceInputOfSend()).toBe(false);
  });

  it('inserts dictated text into the textarea undo history and restores focus', async () => {
    const execCommand = vi.fn(() => true);
    const original = Object.getOwnPropertyDescriptor(document, 'execCommand');
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    try {
      const { input } = await renderWithSend();
      fireEvent.change(input, { target: { value: 'Existing prompt' } });

      fireEvent.click(screen.getByTestId('chat-input-microphone'));
      await act(() => Promise.resolve());

      expect(execCommand).toHaveBeenCalledWith(
        'insertText',
        false,
        ' Bitte Antrag prüfen',
      );
      expect(document.activeElement).toBe(input);
    } finally {
      if (original) Object.defineProperty(document, 'execCommand', original);
      else Reflect.deleteProperty(document, 'execCommand');
    }
  });

  it('hides dictation while the instance turns voice off', async () => {
    serveComposer({ 'GET /feature-toggles': { voiceEnabled: false } });
    await renderComposer();

    expect(screen.queryByTestId('chat-input-microphone')).toBeNull();
  });

  it('shows a toast when dictation fails', async () => {
    voiceRecorder.errorKey = 'chatInput.microphonePermissionError';
    serveComposer();
    await renderComposer();

    fireEvent.click(await screen.findByTestId('chat-input-microphone'));
    await act(() => Promise.resolve());

    expect(toast.error).toHaveBeenCalledWith(
      'chatInput.microphonePermissionError',
      expect.anything(),
    );
  });
});

describe('composer starting a chat', () => {
  it('starts the chat with the images already attached in the composer', async () => {
    const requests = serveComposer();
    const { starts } = await renderComposer();
    const screenshot = imageOfSize(1024);
    fireEvent.change(screen.getByTestId('chat-file-upload-input'), {
      target: { files: [screenshot] },
    });
    await act(() => Promise.resolve());

    send('Prepare reply');

    await waitFor(() => expect(starts()).toHaveLength(1));
    expect(starts()[0]).toMatchObject({
      threadId: startedThread.id,
      text: 'Prepare reply',
      images: [{ file: screenshot, altText: 'site-photo.jpg' }],
    });
    expect(createdChats(requests)).toEqual([
      expect.objectContaining({
        modelId: municipalModel.id,
        isAnonymous: false,
      }),
    ]);
  });

  it('starts a chat in a mode by sending the mode, not a model id', async () => {
    const requests = serveComposer({
      'GET /models/default-selection': {
        mode: 'auto',
        permittedModelId: municipalModel.id,
      },
      'GET /models/modes': [
        {
          mode: 'auto',
          permittedModelId: municipalModel.id,
          anonymousPermittedModelId: municipalModel.id,
        },
      ],
    });
    mountComposer();
    await waitFor(() =>
      expect(screen.getByTestId<HTMLButtonElement>('send').disabled).toBe(true),
    );
    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'Hello' },
    });
    await waitFor(() =>
      expect(screen.getByTestId<HTMLButtonElement>('send').disabled).toBe(
        false,
      ),
    );

    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() => expect(createdChats(requests)).toHaveLength(1));
    const [created] = createdChats(requests);
    expect(created.mode).toBe('auto');
    expect(created).not.toHaveProperty('modelId');
  });

  it('does not start a chat in a mode that resolves to no model', async () => {
    const requests = serveComposer({
      'GET /models/default-selection': {
        mode: 'max',
        permittedModelId: municipalModel.id,
      },
      'GET /models/modes': [
        {
          mode: 'max',
          permittedModelId: null,
          anonymousPermittedModelId: null,
        },
      ],
    });
    mountComposer();
    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'Hello' },
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    fireEvent.click(screen.getByTestId('send'));

    expect(createdChats(requests)).toHaveLength(0);
  });

  it('starts a chat on an anonymous-only model as anonymous', async () => {
    const requests = serveComposer({
      'GET /models/permitted/language-models': [
        { ...municipalModel, anonymousOnly: true },
      ],
    });
    await renderComposer();

    send('Prüfe den Antrag');

    await waitFor(() =>
      expect(createdChats(requests)).toEqual([
        expect.objectContaining({ isAnonymous: true }),
      ]),
    );
  });

  it('keeps the model picker locked until the default is known, so a pick is not replaced', async () => {
    serveComposer({
      'GET /models/default-selection': () => new Promise(() => undefined),
    });
    mountComposer();
    await waitFor(() =>
      expect(screen.getByTestId('chat-model-selector').textContent).toContain(
        municipalModel.displayName,
      ),
    );

    expect(
      screen.getByTestId<HTMLButtonElement>('chat-model-selector').disabled,
    ).toBe(true);
  });

  it('starts a chat on the default model when the model list cannot be loaded', async () => {
    const requests = serveComposer({
      'GET /models/permitted/language-models': () => {
        throw new Error('Models unavailable');
      },
    });
    mountComposer();
    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'Hello' },
    });
    await waitFor(() =>
      expect(screen.getByTestId<HTMLButtonElement>('send').disabled).toBe(
        false,
      ),
    );

    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() =>
      expect(createdChats(requests)).toEqual([
        expect.objectContaining({ modelId: municipalModel.id }),
      ]),
    );
  });

  it('keeps the text and photos of a start that failed, so it can be retried', async () => {
    serveComposer({
      'POST /threads': () => {
        throw new Error('Unavailable');
      },
    });
    await renderComposer();
    fireEvent.change(screen.getByTestId('chat-file-upload-input'), {
      target: { files: [imageOfSize(1024)] },
    });
    await act(() => Promise.resolve());

    send('Prepare reply');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'chat.errorSendMessage',
        expect.anything(),
      ),
    );
    expect(screen.getByTestId<HTMLTextAreaElement>('input').value).toBe(
      'Prepare reply',
    );
    expect(screen.getByAltText('site-photo.jpg')).toBeTruthy();
  });

  it('starts with a model from the link without waiting for the default', async () => {
    const requests = serveComposer({
      'GET /models/default-selection': () => new Promise(() => undefined),
    });
    mountComposer({ initialModel: municipalModel.id });
    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'Hello' },
    });
    await waitFor(() =>
      expect(screen.getByTestId<HTMLButtonElement>('send').disabled).toBe(
        false,
      ),
    );

    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() =>
      expect(createdChats(requests)).toEqual([
        expect.objectContaining({ modelId: municipalModel.id }),
      ]),
    );
  });

  it('keeps sending disabled for a user without the academy certificate', async () => {
    const requests = serveComposer({
      'GET /academy-access/status': { allowed: false },
    });
    await renderComposer();
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    send('Hello');

    expect(createdChats(requests)).toHaveLength(0);
  });
});

describe('composer surface-specific features', () => {
  function openPlusMenu() {
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'chatInput.addButtonTooltip' }),
      { key: 'ArrowDown' },
    );
  }

  it('offers knowledge bases only when the surface passes them', async () => {
    const requests = serveComposer();
    await renderComposer();
    openPlusMenu();
    await screen.findByRole('menuitem', { name: 'chatInput.uploadFile' });

    expect(screen.queryByText('chatInput.addKnowledgeBase')).toBeNull();
    expect(requestsTo(requests, '/knowledge-bases')).toHaveLength(0);
  });

  it('closes the plus menu when a start begins but keeps the passed menu', async () => {
    serveComposer({ 'POST /threads': () => new Promise(() => undefined) });
    await renderComposer({
      config: {
        layout: 'page',
        knowledgeBases: {
          items: [],
          status: 'ready',
          attached: [],
          attach: vi.fn(),
          detach: vi.fn(),
          create: vi.fn(),
        },
        events: { onNewChat: vi.fn() },
      },
    });
    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'Hello' },
    });
    openPlusMenu();
    expect(await screen.findByText('chatInput.addKnowledgeBase')).toBeTruthy();

    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() =>
      expect(screen.queryByText('chatInput.addKnowledgeBase')).toBeNull(),
    );
  });

  it('attaches the knowledge bases picked before the start to the new chat', async () => {
    const requests = serveComposer({
      'POST /threads/started-thread/knowledge-bases/kb-budget': {},
    });
    const knowledgeBases: ChatKnowledgeBases = {
      items: [],
      status: 'ready',
      attached: [{ id: 'kb-budget', name: 'Haushalt' }],
      attach: vi.fn(),
      detach: vi.fn(),
      create: vi.fn(),
    };
    const { starts } = await renderComposer({
      config: {
        layout: 'page',
        knowledgeBases,
        events: { onNewChat: vi.fn() },
      },
    });

    send('Fasse den Haushalt zusammen');

    await waitFor(() => expect(starts()).toHaveLength(1));
    expect(
      requests.some(
        ({ method, url }) =>
          method === 'POST' &&
          url === '/threads/started-thread/knowledge-bases/kb-budget',
      ),
    ).toBe(true);
  });
});

describe('conversation composer prompt recall', () => {
  function renderWithPrompts(prompts: string[] = []) {
    serveComposer();
    const thread = {
      id: 'thread',
      title: 'Thread',
      piiMasks: [],
      messages: prompts.map(
        (text, index) =>
          ({
            id: `u${index}`,
            threadId: 'thread',
            role: 'user',
            createdAt: '2026-11-24T12:00:00Z',
            content: [{ type: 'text', text }],
          }) as never,
      ),
    };
    renderWithQueryClient(
      <Conversation
        config={{
          sessionKey: 'test-user',
          transport: { send: vi.fn() },
          layout: 'page',
          events: { onNewChat: vi.fn() },
        }}
        threadId={thread.id}
      />,
      [thread],
    );
    const input = screen.getByTestId<HTMLTextAreaElement>('input');
    fireEvent.focus(input);
    return input;
  }

  function moveCaret(input: HTMLTextAreaElement, position: number) {
    input.setSelectionRange(position, position);
  }

  beforeEach(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
  });

  it('walks back and forth through the thread’s prompts', () => {
    const input = renderWithPrompts([
      'Opening hours of the town hall?',
      'Draft a parking permit notice',
    ]);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('Draft a parking permit notice');
    expect(input.selectionStart).toBe(0);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('Opening hours of the town hall?');

    moveCaret(input, input.value.length);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('Draft a parking permit notice');
    expect(input.selectionStart).toBe(input.value.length);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('');
  });

  it('recalls nothing without prompts, as on a new chat', () => {
    const input = renderWithPrompts();

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('');
  });

  it('leaves a typed draft untouched', () => {
    const input = renderWithPrompts(['Summarise the council minutes']);
    fireEvent.change(input, { target: { value: 'half-typed question' } });
    moveCaret(input, 0);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('half-typed question');
  });

  it.each(['shiftKey', 'ctrlKey', 'altKey', 'metaKey'])(
    'keeps native %s arrow shortcuts',
    (modifier) => {
      const input = renderWithPrompts(['List open building applications']);
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      moveCaret(input, input.value.length);

      fireEvent.keyDown(input, { key: 'ArrowDown', [modifier]: true });
      expect(input.value).toBe('List open building applications');
    },
  );

  // Wrapped and multi-line prompts both have rows between the text edges;
  // only the browser knows where the rows break, so recall waits for the
  // caret to reach the start or end of the whole text.
  it('lets the caret move through a recalled prompt before recalling again', () => {
    const input = renderWithPrompts([
      'Older prompt',
      'A long paragraph that wraps\nacross several rows',
    ]);
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    moveCaret(input, 10);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe(
      'A long paragraph that wraps\nacross several rows',
    );
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe(
      'A long paragraph that wraps\nacross several rows',
    );

    moveCaret(input, 0);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('Older prompt');
  });
});
