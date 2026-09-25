import type { ReactNode } from 'react';
import { AxiosError, AxiosHeaders } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import InstallMarketplaceSkillWidget from '@/pages/chat/ui/chat-widgets/InstallMarketplaceSkillWidget';

const {
  installSkill,
  permissions,
  catalogue,
  installedEntry,
  showError,
  showSuccess,
} = vi.hoisted(() => ({
  installSkill: vi.fn(),
  permissions: { canManageSkills: true },
  catalogue: {
    state: 'success',
  },
  installedEntry: { skillId: null as string | null },
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const CATALOGUE_ENTRY = {
  identifier: 'finance-clerk',
  name: 'Finanzsachbearbeitung',
  shortDescription: 'Hilft bei Haushaltsfragen',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/toast', () => ({ showSuccess, showError }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    params,
    ...rest
  }: {
    children: ReactNode;
    to: string;
    search?: Record<string, string>;
    params?: Record<string, string>;
  }) => {
    let href = to;
    for (const [key, value] of Object.entries(params ?? {})) {
      href = href.replace(`$${key}`, value);
    }
    if (search) href += `?${new URLSearchParams(search).toString()}`;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/features/permissions', () => ({
  PermissionGate: ({
    children,
    fallback,
  }: {
    children: ReactNode;
    fallback: ReactNode;
  }) => <>{permissions.canManageSkills ? children : fallback}</>,
}));

vi.mock('@/shared/api', () => ({
  skillsControllerInstallFromMarketplace: installSkill,
  useMarketplaceControllerGetSkill: () => ({
    data: catalogue.state === 'success' ? CATALOGUE_ENTRY : undefined,
    isPending: catalogue.state === 'loading',
    isError: catalogue.state === 'error',
  }),
  useSkillsControllerFindInstalledFromMarketplace: () => ({
    data: { skillId: installedEntry.skillId },
  }),
  getSkillsControllerFindInstalledFromMarketplaceQueryKey: (id: string) => [
    `/skills/marketplace/${id}`,
  ],
  getSkillsControllerFindAllQueryKey: (params: unknown) => ['/skills', params],
  getThreadAiContextControllerGetAiContextQueryKey: (id: string) => [
    `/threads/${id}/ai-context`,
  ],
  getWorkspaceContextControllerFindContextQueryKey: (id: string) => [
    `/workspaces/${id}/context`,
  ],
}));

function makeContent(): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tc-1',
    name: 'install_marketplace_skill',
    params: {
      identifier: 'finance-clerk',
      // Model-supplied text that must never become the confirmable identity.
      name: 'Harmless looking name',
      reason: 'Fits budget work',
    },
  } as unknown as ToolUseMessageContent;
}

function renderWidget() {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <InstallMarketplaceSkillWidget
      content={makeContent()}
      threadId="thread-id"
    />,
    { wrapper },
  );
  return { invalidateQueries };
}

describe('InstallMarketplaceSkillWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.canManageSkills = true;
    catalogue.state = 'success';
    installedEntry.skillId = null;
    installSkill.mockResolvedValue({ id: 'skill-id' });
  });

  it('links to the existing skill instead of offering a second install', () => {
    installedEntry.skillId = 'existing-skill-id';
    renderWidget();

    const link = screen.getByTestId('marketplace-install-already-installed');
    expect(link.getAttribute('href')).toBe('/skills/existing-skill-id');
    expect(screen.queryByTestId('marketplace-install-button')).toBeNull();
    expect(screen.queryByTestId('marketplace-install-link')).toBeNull();
    expect(installSkill).not.toHaveBeenCalled();
  });

  it('shows only the fetched catalogue entry and installs it after the user confirms', async () => {
    const { invalidateQueries } = renderWidget();

    expect(screen.getByText('Finanzsachbearbeitung')).toBeTruthy();
    expect(screen.queryByText('Harmless looking name')).toBeNull();
    expect(screen.queryByText('Fits budget work')).toBeNull();
    expect(installSkill).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('marketplace-install-button'));

    await waitFor(() => expect(installSkill).toHaveBeenCalledTimes(1));
    expect(installSkill).toHaveBeenCalledWith({
      identifier: CATALOGUE_ENTRY.identifier,
    });
    await waitFor(() =>
      expect(screen.getByTestId('marketplace-install-done')).toBeTruthy(),
    );
    expect(screen.queryByTestId('marketplace-install-button')).toBeNull();
    expect(showSuccess).toHaveBeenCalledWith(
      'chat.tools.install_marketplace_skill.success',
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/skills', { ownerType: 'personal' }],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/threads/thread-id/ai-context'],
    });
  });

  it('offers nothing to confirm while the catalogue entry is still loading', () => {
    catalogue.state = 'loading';
    renderWidget();

    expect(screen.getByTestId('marketplace-install-state').textContent).toBe(
      'chat.tools.install_marketplace_skill.loading',
    );
    expect(screen.queryByTestId('marketplace-install-button')).toBeNull();
    expect(screen.queryByTestId('marketplace-install-link')).toBeNull();
  });

  it('offers nothing to confirm when the catalogue entry cannot be loaded', () => {
    catalogue.state = 'error';
    renderWidget();

    expect(screen.getByTestId('marketplace-install-state').textContent).toBe(
      'chat.tools.install_marketplace_skill.entryUnavailable',
    );
    expect(screen.queryByText('Harmless looking name')).toBeNull();
    expect(screen.queryByTestId('marketplace-install-button')).toBeNull();
    expect(installSkill).not.toHaveBeenCalled();
  });

  it('offers only the install page link to members without manage_skills', () => {
    permissions.canManageSkills = false;
    renderWidget();

    expect(screen.queryByTestId('marketplace-install-button')).toBeNull();
    const link = screen.getByTestId('marketplace-install-link');
    expect(link.getAttribute('href')).toBe('/install?skill=finance-clerk');
    expect(installSkill).not.toHaveBeenCalled();
  });

  it('reports a removed catalogue entry and keeps the card actionable', async () => {
    installSkill.mockRejectedValue(
      new AxiosError('gone', '404', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { code: 'MARKETPLACE_SKILL_NOT_FOUND', message: 'gone' },
      }),
    );
    renderWidget();

    fireEvent.click(screen.getByTestId('marketplace-install-button'));

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith(
        'chat.tools.install_marketplace_skill.notFound',
      ),
    );
    expect(screen.getByTestId('marketplace-install-button')).toBeTruthy();
    expect(screen.queryByTestId('marketplace-install-done')).toBeNull();
  });
});
