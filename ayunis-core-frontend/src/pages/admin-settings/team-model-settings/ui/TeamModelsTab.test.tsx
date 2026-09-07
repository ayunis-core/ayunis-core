import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamModelsTab } from './TeamModelsTab';

const queryState = vi.hoisted(() => ({
  language: { isLoading: false, isError: false },
  image: { isLoading: false, isError: false },
  teamLanguage: { isLoading: false, isError: false },
  teamImage: { isLoading: false, isError: false },
}));

beforeEach(() => {
  Object.values(queryState).forEach((state) => {
    state.isLoading = false;
    state.isError = false;
  });
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/models', () => ({
  useLanguageModels: () => ({
    models: [
      {
        modelId: 'org-model',
        name: 'Organization model',
        provider: 'openai',
        isPermitted: true,
      },
    ],
    ...queryState.language,
  }),
  useImageGenerationModels: () => ({ models: [], ...queryState.image }),
}));
vi.mock(
  '@/pages/admin-settings/team-model-settings/api/useTeamPermittedModels',
  () => ({
    useTeamPermittedModels: () => ({
      models: [],
      ...queryState.teamLanguage,
    }),
  }),
);
vi.mock(
  '@/pages/admin-settings/team-model-settings/api/useTeamPermittedImageGenerationModels',
  () => ({
    useTeamPermittedImageGenerationModels: () => ({
      models: [],
      ...queryState.teamImage,
    }),
  }),
);
vi.mock(
  '@/pages/admin-settings/team-model-settings/api/useToggleModelOverride',
  () => ({
    useToggleModelOverride: () => ({
      toggleModelOverride: vi.fn(),
      isToggling: false,
    }),
  }),
);
vi.mock(
  '@/pages/admin-settings/team-model-settings/api/useCreateTeamPermittedModel',
  () => ({
    useCreateTeamPermittedModel: () => ({
      createTeamPermittedModel: vi.fn(),
      isCreating: false,
    }),
  }),
);
vi.mock(
  '@/pages/admin-settings/team-model-settings/api/useDeleteTeamPermittedModel',
  () => ({
    useDeleteTeamPermittedModel: () => ({
      deleteTeamPermittedModel: vi.fn(),
      isDeleting: false,
    }),
  }),
);
vi.mock(
  '@/pages/admin-settings/team-model-settings/api/useUpdateTeamPermittedModel',
  () => ({
    useUpdateTeamPermittedModel: () => ({ updateTeamPermittedModel: vi.fn() }),
  }),
);
vi.mock('./TeamDefaultModelCard', () => ({
  TeamDefaultModelCard: () => <div data-testid="team-default-model" />,
}));

describe(TeamModelsTab.name, () => {
  it.each(['language', 'image', 'teamLanguage', 'teamImage'] as const)(
    'waits for %s before showing custom model controls',
    (query) => {
      queryState[query].isLoading = true;
      const client = new QueryClient();
      const content = () => (
        <QueryClientProvider client={client}>
          <TeamModelsTab
            teamId="team"
            teamName="Planning"
            modelOverrideEnabled
          />
        </QueryClientProvider>
      );
      const { rerender } = render(content());
      expect(screen.getByRole('status').textContent).toBe('models.loading');
      expect(screen.queryByTestId('team-default-model')).toBeNull();
      expect(screen.queryByTestId('team-model-language-card')).toBeNull();
      expect(
        screen.queryByTestId('team-model-image-generation-card'),
      ).toBeNull();
      expect(screen.getAllByRole('switch')).toHaveLength(1);

      queryState[query].isLoading = false;
      rerender(content());
      expect(screen.getByTestId('team-model-language-card')).toBeTruthy();
      expect(screen.getByTestId('team-default-model')).toBeTruthy();
    },
  );

  it.each(['language', 'image'] as const)(
    'keeps the override control without inherited-model errors when %s fails',
    (query) => {
      queryState[query].isError = true;
      render(
        <QueryClientProvider client={new QueryClient()}>
          <TeamModelsTab
            teamId="team"
            teamName="Planning"
            modelOverrideEnabled={false}
          />
        </QueryClientProvider>,
      );
      expect(screen.getByTestId('team-model-override-toggle')).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByTestId('team-model-inherited')).toBeNull();
    },
  );

  it('shows only the policy card when override is off', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeamModelsTab
          teamId="team"
          teamName="Planning"
          modelOverrideEnabled={false}
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByText('Organization model')).toBeNull();
    expect(screen.queryByTestId('team-model-inherited')).toBeNull();
    expect(screen.queryByTestId('team-default-model')).toBeNull();
    expect(screen.queryByTestId('team-model-language-card')).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(
      screen
        .getByTestId('team-model-override-toggle')
        .getAttribute('data-state'),
    ).toBe('unchecked');
  });
});
