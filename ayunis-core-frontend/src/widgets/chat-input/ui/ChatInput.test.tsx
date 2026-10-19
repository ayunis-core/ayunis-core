import { act, createRef, type ReactNode, type RefObject } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showError } from '@/shared/lib/toast';
import { MAX_IMAGE_SIZE_BYTES } from '@/widgets/chat-input/model/image-upload-policy';
import { clearPromptHistory } from '@/shared/lib/prompt-history';
import ChatInput, { type ChatInputRef } from './ChatInput';

vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/widgets/onboarding', () => ({
  OnboardingTourTarget: ({ children }: { children: ReactNode }) => children,
  TOUR_TARGET: { chatComposer: 'chatComposer' },
}));
vi.mock('./SourcesList', () => ({ SourcesList: () => null }));
vi.mock('./ChatInputActionBar', () => ({
  ChatInputActionBar: ({
    onImageSelect,
  }: {
    onImageSelect: (files: FileList | null) => void;
  }) => (
    <input
      data-testid="image-picker"
      type="file"
      onChange={(event) => onImageSelect(event.target.files)}
    />
  ),
}));

function oversizedImage(): File {
  const file = new File([''], 'permit-scan.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: MAX_IMAGE_SIZE_BYTES + 1 });
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
  vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ChatInput image rejection', () => {
  it('notifies when an oversized image is selected', () => {
    renderComposer();
    fireEvent.change(screen.getByTestId('image-picker'), {
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
  beforeEach(() => clearPromptHistory());

  function renderWithRef() {
    const ref = createRef<ChatInputRef>();
    render(
      <ChatInput
        ref={ref}
        modelId="municipal-model"
        sources={[]}
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
    return { ref, input };
  }

  function sendPrompt(
    ref: RefObject<ChatInputRef | null>,
    input: HTMLTextAreaElement,
    prompt: string,
  ) {
    fireEvent.change(input, { target: { value: prompt } });
    fireEvent.keyDown(input, { key: 'Enter' });
    act(() => ref.current?.setMessage(''));
  }

  function moveCaret(input: HTMLTextAreaElement, position: number) {
    input.setSelectionRange(position, position);
  }

  it('walks back and forth through sent prompts with the arrow keys', () => {
    const { ref, input } = renderWithRef();
    sendPrompt(ref, input, 'Opening hours of the town hall?');
    sendPrompt(ref, input, 'Draft a parking permit notice');

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

  it('leaves a typed draft untouched', () => {
    const { ref, input } = renderWithRef();
    sendPrompt(ref, input, 'Summarise the council minutes');
    fireEvent.change(input, { target: { value: 'half-typed question' } });
    moveCaret(input, 0);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('half-typed question');
  });

  it.each(['shiftKey', 'ctrlKey', 'altKey', 'metaKey'])(
    'keeps native %s arrow shortcuts',
    (modifier) => {
      const { ref, input } = renderWithRef();
      sendPrompt(ref, input, 'List open building applications');
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
    const { ref, input } = renderWithRef();
    sendPrompt(ref, input, 'Older prompt');
    sendPrompt(ref, input, 'A long paragraph that wraps\nacross several rows');
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
