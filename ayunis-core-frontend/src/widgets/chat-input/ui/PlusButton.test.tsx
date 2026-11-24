import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatCapabilities } from '@ayunis/chat/surface';
import PlusButton from './PlusButton';

const capabilityState = vi.hoisted((): { value: ChatCapabilities } => ({
  value: {},
}));
vi.mock('@/features/chat-surface', () => ({
  useAppChatSurface: () => ({ capabilities: capabilityState.value }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/widgets/chat-input/api/useKnowledgeBases', () => ({
  useKnowledgeBases: () => ({
    knowledgeBases: [],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@ayunis/api-client/endpoints', () => ({
  useSkillsControllerFindAll: () => ({
    data: { data: [{ id: 'skill-1', name: 'Formal tone', isActive: true }] },
    isLoading: false,
    error: null,
  }),
}));

afterEach(() => {
  cleanup();
  capabilityState.value = { fileUpload: true, audio: true, skills: true };
});
capabilityState.value = { fileUpload: true, audio: true, skills: true };

async function openMenu() {
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'chatInput.addButtonTooltip' }),
    { key: 'ArrowDown' },
  );
  await screen.findByRole('menuitem', { name: 'chatInput.uploadFile' });
}

describe('PlusButton', () => {
  it('offers only file upload and skills when the audio capability is disabled', async () => {
    capabilityState.value = { fileUpload: true };
    render(<PlusButton onFileUpload={vi.fn()} onSkillSelect={vi.fn()} />);
    await openMenu();

    expect(
      screen.getByRole('menuitem', { name: 'chatInput.addSkill' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('menuitem', { name: 'chatInput.uploadAudio' }),
    ).toBeNull();
  });

  it('keeps the skill picker reachable when the org allows no uploads', async () => {
    capabilityState.value = { fileUpload: true };
    render(
      <PlusButton
        onFileUpload={vi.fn()}
        onSkillSelect={vi.fn()}
        isFileSourceDisabled
        isImageUploadDisabled
      />,
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'chatInput.addButtonTooltip',
      }).disabled,
    ).toBe(false);
    await openMenu();

    expect(
      screen.getByRole('menuitem', { name: 'chatInput.addSkill' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('menuitem', { name: 'chatInput.uploadFile' })
        .getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('closes skill selection during submit and allows it again after cancel', async () => {
    const props = {
      onFileUpload: vi.fn(),
      onSkillSelect: vi.fn(),
      isFileSourceDisabled: true,
      isImageUploadDisabled: true,
    };
    const { rerender } = render(<PlusButton {...props} />);
    await openMenu();
    const menuItem = screen.getByRole('menuitem', {
      name: 'chatInput.addSkill',
    });
    fireEvent.keyDown(menuItem, { key: 'ArrowRight' });
    await screen.findByRole('menuitem', { name: 'Formal tone' });

    rerender(<PlusButton {...props} isSubmitting />);
    expect(screen.queryByRole('menuitem', { name: 'Formal tone' })).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'chatInput.addButtonTooltip',
      }).disabled,
    ).toBe(true);

    rerender(<PlusButton {...props} />);
    await openMenu();
    expect(
      screen.getByRole('menuitem', { name: 'chatInput.addSkill' }),
    ).toBeTruthy();
  });

  it('keeps audio upload and shows no skill picker in the web composer', async () => {
    render(<PlusButton onFileUpload={vi.fn()} />);
    await openMenu();

    expect(
      screen.getByRole('menuitem', { name: 'chatInput.uploadAudio' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('menuitem', { name: 'chatInput.addSkill' }),
    ).toBeNull();
  });
});
