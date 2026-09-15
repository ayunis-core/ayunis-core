import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import CreateSkillWidget from '@/pages/chat/ui/chat-widgets/CreateSkillWidget';
import EditSkillWidget from '@/pages/chat/ui/chat-widgets/EditSkillWidget';

const { createSkill, updateSkill, showError } = vi.hoisted(() => ({
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError,
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  skillsControllerCreate: createSkill,
  skillsControllerUpdate: updateSkill,
  getSkillsControllerFindAllQueryKey: (params: unknown) => ['/skills', params],
  getSkillsControllerFindOneQueryKey: (skillId: string) => ['/skills', skillId],
  useSkillsControllerFindAll: () => ({
    data: {
      data: [
        {
          id: 'skill-id',
          name: 'Protokoll',
          shortDescription: 'Writes minutes',
          instructions: 'Summarise the meeting',
        },
      ],
    },
  }),
}));

function duplicateNameError() {
  const error = new AxiosError('Conflict');
  error.response = {
    data: {
      code: 'DUPLICATE_SKILL_NAME',
      message: 'A skill with the name "Protokoll" already exists',
    },
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: {} },
  } as typeof error.response;
  return error;
}

function makeContent(
  name: string,
  params: Record<string, unknown>,
): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tc-1',
    name,
    params,
  } as unknown as ToolUseMessageContent;
}

function renderWidget(widget: ReactNode) {
  const queryClient = new QueryClient();
  render(widget, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('skill chat widgets on a duplicate name', () => {
  it('shows the duplicate-name error when creating', async () => {
    createSkill.mockRejectedValue(duplicateNameError());
    renderWidget(
      <CreateSkillWidget
        content={makeContent('create_skill', {
          name: 'Protokoll',
          short_description: 'Writes minutes',
          instructions: 'Summarise the meeting',
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'chat.tools.create_skill.create' }),
    );

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith(
        'chat.tools.create_skill.errorDuplicate',
      ),
    );
  });

  it('shows the duplicate-name error when editing', async () => {
    updateSkill.mockRejectedValue(duplicateNameError());
    renderWidget(
      <EditSkillWidget
        content={makeContent('edit_skill', {
          skill_slug: 'protokoll',
          name: 'Notizen',
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'chat.tools.edit_skill.update' }),
    );

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith(
        'chat.tools.edit_skill.errorDuplicate',
      ),
    );
  });
});
