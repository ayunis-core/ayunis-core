import { createRef, type ReactNode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ComposerExports from '@ayunis/chat/composer';
import { showError } from '@/shared/lib/toast';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_TOTAL_IMAGE_SIZE_BYTES,
} from '@/widgets/chat-input/model/image-upload-policy';
import ChatInput, { type ChatInputRef } from './ChatInput';

const voiceFlag = vi.hoisted(() => ({ enabled: true }));
const voiceRecorder = vi.hoisted(() => ({
  errorKey: undefined as string | undefined,
}));

vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@/features/chat-surface', () => ({
  useAppChatSurface: () => ({
    capabilities: { fileUpload: true, voice: true },
  }),
}));
vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: () => voiceFlag.enabled,
}));
vi.mock('@/widgets/chat-input/api/useTranscribe', () => ({
  useTranscribe: () => ({ transcribe: vi.fn(async () => null) }),
}));
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
vi.mock('@/widgets/onboarding', () => ({
  OnboardingTourTarget: ({ children }: { children: ReactNode }) => children,
  TOUR_TARGET: {
    chatComposer: 'chatComposer',
    chatUpload: 'chatUpload',
    anonymousMode: 'anonymousMode',
    modelSelector: 'modelSelector',
    voiceInput: 'voiceInput',
    sendMessage: 'sendMessage',
  },
}));

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

function renderComposer() {
  return render(
    <ChatInput
      modelId="municipal-model"
      sources={[]}
      isVisionEnabled
      isEmbeddingModelEnabled={false}
      isAnonymous={false}
      onModelChange={vi.fn()}
      onFileUpload={vi.fn()}
      onRemoveSource={vi.fn()}
      onSend={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  voiceFlag.enabled = true;
  voiceRecorder.errorKey = undefined;
  vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ChatInput image rejection', () => {
  it('notifies when an oversized image is selected', () => {
    renderComposer();
    fireEvent.change(screen.getByTestId('chat-file-upload-input'), {
      target: { files: [oversizedImage()] },
    });
    expect(showError).toHaveBeenCalledWith('chatInput.imageTooLarge');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('notifies when an oversized image is dropped', () => {
    renderComposer();
    fireEvent.drop(screen.getByTestId('chat-input'), {
      dataTransfer: { files: [oversizedImage()] },
    });
    expect(showError).toHaveBeenCalledWith('chatInput.imageTooLarge');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('notifies when selected images exceed the per-message total', () => {
    renderComposer();
    const count = MAX_TOTAL_IMAGE_SIZE_BYTES / MAX_IMAGE_SIZE_BYTES + 1;
    fireEvent.change(screen.getByTestId('chat-file-upload-input'), {
      target: {
        files: Array.from({ length: count }, () =>
          imageOfSize(MAX_IMAGE_SIZE_BYTES),
        ),
      },
    });
    expect(showError).toHaveBeenCalledWith('chatInput.imageTotalTooLarge');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(count - 1);
  });
  it('notifies when an oversized image is pasted', () => {
    renderComposer();
    const file = oversizedImage();
    fireEvent.focus(screen.getByTestId('input'));
    fireEvent.paste(screen.getByTestId('input'), {
      clipboardData: {
        getData: () => '',
        items: [{ type: 'image/png', getAsFile: () => file }],
      },
    });
    expect(showError).toHaveBeenCalledWith('chatInput.imageTooLarge');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('ChatInput prompt recall', () => {
  function renderWithPrompts(sentPrompts?: string[]) {
    render(
      <ChatInput
        modelId="municipal-model"
        sources={[]}
        sentPrompts={sentPrompts}
        isEmbeddingModelEnabled={false}
        isAnonymous={false}
        onModelChange={vi.fn()}
        onFileUpload={vi.fn()}
        onRemoveSource={vi.fn()}
        onSend={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByTestId<HTMLTextAreaElement>('input');
    fireEvent.focus(input);
    return input;
  }

  function moveCaret(input: HTMLTextAreaElement, position: number) {
    input.setSelectionRange(position, position);
  }

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

describe('ChatInput while a message is in flight', () => {
  it.each(['submitting', 'streaming'] as const)(
    'ignores Send while %s, so a waiting message is not replaced',
    (submissionState) => {
      const onSend = vi.fn();
      render(
        <ChatInput
          modelId="municipal-model"
          sources={[]}
          submissionState={submissionState}
          isEmbeddingModelEnabled={false}
          isAnonymous={false}
          onModelChange={vi.fn()}
          onFileUpload={vi.fn()}
          onRemoveSource={vi.fn()}
          onSend={onSend}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByTestId('input'), {
        target: { value: 'Bitte Antrag prüfen' },
      });
      fireEvent.keyDown(screen.getByTestId('input'), { key: 'Enter' });

      expect(onSend).not.toHaveBeenCalled();
    },
  );

  it('does not upload a dropped document while a reply streams', () => {
    const onFileUpload = vi.fn();
    render(
      <ChatInput
        modelId="municipal-model"
        sources={[]}
        submissionState="streaming"
        isEmbeddingModelEnabled
        isAnonymous={false}
        onModelChange={vi.fn()}
        onFileUpload={onFileUpload}
        onRemoveSource={vi.fn()}
        onSend={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.drop(screen.getByTestId('chat-input'), {
      dataTransfer: {
        files: [
          new File(['permit'], 'permit.pdf', { type: 'application/pdf' }),
        ],
      },
    });

    expect(onFileUpload).not.toHaveBeenCalled();
  });
});

describe('ChatInput voice input', () => {
  function renderWithSend() {
    const onSend = vi.fn();
    render(
      <ChatInput
        modelId="municipal-model"
        sources={[]}
        isEmbeddingModelEnabled={false}
        isAnonymous={false}
        onModelChange={vi.fn()}
        onFileUpload={vi.fn()}
        onRemoveSource={vi.fn()}
        onSend={onSend}
        onCancel={vi.fn()}
      />,
    );
    const voiceInputOfSend = () => {
      fireEvent.click(screen.getByTestId('send'));
      return onSend.mock.calls[0]?.[3] as boolean | undefined;
    };
    return { input: screen.getByTestId('input'), voiceInputOfSend };
  }

  it('reports a prompt with dictated text as voice input', () => {
    const { voiceInputOfSend } = renderWithSend();

    fireEvent.click(screen.getByTestId('chat-input-microphone'));

    expect(voiceInputOfSend()).toBe(true);
  });

  it('does not report a typed prompt as voice input', () => {
    const { input, voiceInputOfSend } = renderWithSend();

    fireEvent.change(input, { target: { value: 'Bitte Antrag prüfen' } });

    expect(voiceInputOfSend()).toBe(false);
  });

  it('forgets dictated text once the prompt was cleared', () => {
    const { input, voiceInputOfSend } = renderWithSend();

    fireEvent.click(screen.getByTestId('chat-input-microphone'));
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 'Bitte Antrag prüfen' } });

    expect(voiceInputOfSend()).toBe(false);
  });

  it('inserts dictated text into the textarea undo history and restores focus', async () => {
    const execCommand = vi.fn(() => true);
    const original = Object.getOwnPropertyDescriptor(document, 'execCommand');
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    try {
      const { input } = renderWithSend();
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

  it('hides dictation while the voice feature is disabled', () => {
    voiceFlag.enabled = false;
    renderComposer();

    expect(screen.queryByTestId('chat-input-microphone')).toBeNull();
  });

  it('shows a toast when dictation fails', async () => {
    voiceRecorder.errorKey = 'chatInput.microphonePermissionError';
    renderComposer();

    fireEvent.click(screen.getByTestId('chat-input-microphone'));
    await act(() => Promise.resolve());

    expect(showError).toHaveBeenCalledWith(
      'chatInput.microphonePermissionError',
    );
  });
});

describe('ChatInput prompt sending', () => {
  // The Outlook pane's starter prompts send through the composer.
  it('sends a prompt with the images already attached in the composer', async () => {
    const onSend = vi.fn();
    const ref = createRef<ChatInputRef>();
    render(
      <ChatInput
        ref={ref}
        modelId="municipal-model"
        sources={[]}
        isVisionEnabled
        isEmbeddingModelEnabled={false}
        isAnonymous={false}
        onModelChange={vi.fn()}
        onFileUpload={vi.fn()}
        onRemoveSource={vi.fn()}
        onSend={onSend}
        onCancel={vi.fn()}
      />,
    );
    const screenshot = imageOfSize(1024);
    fireEvent.change(screen.getByTestId('chat-file-upload-input'), {
      target: { files: [screenshot] },
    });
    await act(() => Promise.resolve());

    act(() => ref.current?.sendMessage('Prepare reply'));

    expect(onSend).toHaveBeenCalledWith(
      'Prepare reply',
      [{ file: screenshot, altText: 'site-photo.jpg' }],
      undefined,
      false,
    );
  });
});
