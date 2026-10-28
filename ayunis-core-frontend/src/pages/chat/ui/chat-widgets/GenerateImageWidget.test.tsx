import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '@/shared/config';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import GenerateImageWidget from './GenerateImageWidget';
import { generatedImageBackdropStyle } from './generated-image-backdrop';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const saveBlobAs = vi.fn();
vi.mock('@/shared/lib/save-blob-as', () => ({
  saveBlobAs: (...args: unknown[]) => saveBlobAs(...args),
}));

const imageId = '4f3a1c2e-8b7d-4e6a-9c1f-2a6b8d0e4f71';
const imageUrl = `${config.api.baseUrl}/threads/thread-1/generated-images/${imageId}`;

function generatedImageCall(): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tool-image-1',
    name: 'generate_image',
    params: { prompt: 'Navy lettering for Ostheide' },
  };
}

function renderWidget() {
  render(
    <GenerateImageWidget
      content={generatedImageCall()}
      imageId={imageId}
      threadId="thread-1"
    />,
  );
}

function openPreview(): HTMLElement {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'chat.tools.generate_image.openPreview',
    }),
  );
  const dialog = document.querySelector('[data-slot="dialog-content"]');
  expect(dialog).toBeTruthy();
  return dialog as HTMLElement;
}

describe('GenerateImageWidget', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    saveBlobAs.mockReset();
  });

  it('loads the image from the app on a checkerboard in the chat and the enlarged view', () => {
    renderWidget();

    const thumbnail = screen.getByRole('img', {
      name: 'Navy lettering for Ostheide',
    });
    expect(thumbnail.getAttribute('src')).toBe(imageUrl);
    expectCheckerboard(thumbnail);

    const enlarged = openPreview().querySelector('img');
    expect(enlarged?.getAttribute('src')).toBe(imageUrl);
    expectCheckerboard(enlarged as HTMLElement);
  });

  it('retries a failed load before giving up', () => {
    vi.useFakeTimers();
    renderWidget();

    failImageLoad();
    expect(thumbnail().getAttribute('src')).toBe(imageUrl);
    act(() => vi.advanceTimersByTime(1000));
    expect(thumbnail().getAttribute('src')).toBe(`${imageUrl}?attempt=1`);
    fireEvent.load(thumbnail());

    expect(screen.queryByText('chat.tools.generate_image.error')).toBeNull();
  });

  it('shows the error state with a retry once automatic retries are exhausted', () => {
    vi.useFakeTimers();
    renderWidget();

    failImageLoad();
    act(() => vi.advanceTimersByTime(1000));
    failImageLoad();
    act(() => vi.advanceTimersByTime(2000));
    failImageLoad();

    expect(screen.getByText('chat.tools.generate_image.error')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'chat.tools.generate_image.retry' }),
    );

    expect(thumbnail().getAttribute('src')).toBe(`${imageUrl}?attempt=3`);
  });

  it('downloads the image from the app with the session cookie', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob));
    vi.stubGlobal('fetch', fetchMock);
    renderWidget();
    openPreview();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.generate_image.download',
      }),
    );

    await waitFor(() => expect(saveBlobAs).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(imageUrl, {
      credentials: 'include',
    });
    expect(saveBlobAs.mock.calls[0][1]).toBe('ayunis-generated-image.png');
  });

  it('opens the image in a new tab when the download request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);
    renderWidget();
    openPreview();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.generate_image.download',
      }),
    );

    await waitFor(() =>
      expect(openMock).toHaveBeenCalledWith(
        imageUrl,
        '_blank',
        'noopener,noreferrer',
      ),
    );
    expect(saveBlobAs).not.toHaveBeenCalled();
  });
});

function thumbnail(): HTMLElement {
  return screen.getByRole('img', { name: 'Navy lettering for Ostheide' });
}

function failImageLoad(): void {
  fireEvent.error(thumbnail());
}

function expectCheckerboard(image: HTMLElement): void {
  expect(image.style.backgroundImage).toContain('linear-gradient');
  expect(image.style.backgroundImage).toContain('rgb(212, 212, 212)');
  expect(image.style.backgroundColor).toBe('rgb(255, 255, 255)');
  expect(image.style.backgroundSize).toBe(
    generatedImageBackdropStyle.backgroundSize,
  );
}
