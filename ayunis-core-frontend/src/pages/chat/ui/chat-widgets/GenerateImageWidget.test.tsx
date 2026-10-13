import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import GenerateImageWidget from './GenerateImageWidget';
import { generatedImageBackdropStyle } from './generated-image-backdrop';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/pages/chat/api/useResolveGeneratedImage', () => ({
  useResolveGeneratedImage: () => ({
    url: 'https://images.example/ostheide.png',
    isLoading: false,
  }),
}));

function generatedImageCall(): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tool-image-1',
    name: 'generate_image',
    params: { prompt: 'Navy lettering for Ostheide' },
  };
}

describe('GenerateImageWidget', () => {
  it('shows the generated image on a checkerboard in the chat and the enlarged view', () => {
    render(
      <GenerateImageWidget
        content={generatedImageCall()}
        imageId="4f3a1c2e-8b7d-4e6a-9c1f-2a6b8d0e4f71"
        threadId="thread-1"
      />,
    );

    const thumbnail = screen.getByRole('img', {
      name: 'Navy lettering for Ostheide',
    });
    expectCheckerboard(thumbnail);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.generate_image.openPreview',
      }),
    );

    const dialog = document.querySelector('[data-slot="dialog-content"]');
    expect(dialog).toBeTruthy();
    const enlarged = dialog?.querySelector('img');
    expect(enlarged).toBeTruthy();
    expectCheckerboard(enlarged as HTMLElement);
  });
});

function expectCheckerboard(image: HTMLElement): void {
  expect(image.style.backgroundImage).toContain('linear-gradient');
  expect(image.style.backgroundImage).toContain('rgb(212, 212, 212)');
  expect(image.style.backgroundColor).toBe('rgb(255, 255, 255)');
  expect(image.style.backgroundSize).toBe(
    generatedImageBackdropStyle.backgroundSize,
  );
}
