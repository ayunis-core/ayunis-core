import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showError } from '@/shared/lib/toast';
import { MAX_IMAGE_SIZE_BYTES } from '@/widgets/chat-input/model/image-upload-policy';
import ChatInput from './ChatInput';

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
