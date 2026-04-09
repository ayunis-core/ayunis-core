import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgentMcpIntegrationsCard from './AgentMcpIntegrationsCard';
import * as apiHooks from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

// Mock modules
vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({ id: 'test-agent-id' })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      // Simple mock that handles interpolation
      if (key === 'mcpIntegrations.connectedCount') {
        return `${params?.count} connected`;
      }
      if (key === 'mcpIntegrations.toggleAriaLabel') {
        return `Toggle ${params?.name} integration`;
      }
      // Return the key for other translations
      return key;
    },
  }),
}));

vi.mock('@/shared/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

// Helper to create a test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock integration data
const mockIntegration1: McpIntegrationResponseDto = {
  id: 'integration-1',
  name: 'Test Integration 1',
  type: 'predefined' as const,
  slug: 'test-integration-1',
  enabled: true,
  organizationId: 'org-1',
  hasCredentials: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  returnsPii: true,
};

const mockIntegration2: McpIntegrationResponseDto = {
  id: 'integration-2',
  name: 'Test Integration 2',
  type: 'custom' as const,
  serverUrl: 'http://example.com',
  enabled: true,
  organizationId: 'org-1',
  hasCredentials: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  returnsPii: false,
};

describe('AgentMcpIntegrationsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock hooks to return loading state
    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    expect(screen.getByText('mcpIntegrations.title')).toBeTruthy();
    expect(screen.getByText('mcpIntegrations.description')).toBeTruthy();
    // Loading skeletons should be present
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders nothing when no integrations are available', () => {
    // Mock hooks to return empty data
    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    const { container } = render(<AgentMcpIntegrationsCard />, {
      wrapper: createWrapper(),
    });

    // Component returns null when no integrations are available
    expect(container.innerHTML).toBe('');
  });

  it('renders error state when fetching fails', () => {
    const mockRefetch = vi.fn();

    // Mock hooks to return error state
    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    expect(
      screen.getByText('mcpIntegrations.errors.failedToLoad'),
    ).toBeTruthy();
    expect(screen.getByText('mcpIntegrations.retryButton')).toBeTruthy();

    // Test retry button
    const retryButton = screen.getByText('mcpIntegrations.retryButton');
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders available integrations with correct data', () => {
    // Mock hooks to return integrations
    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [mockIntegration1, mockIntegration2],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    // Check if both integrations are rendered by name
    expect(screen.getByText('Test Integration 1')).toBeTruthy();
    expect(screen.getByText('Test Integration 2')).toBeTruthy();
  });

  it('displays correct toggle state for assigned integrations', () => {
    // Mock hooks with one integration assigned
    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [mockIntegration1, mockIntegration2],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [mockIntegration1], // Only integration 1 is assigned
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    // Get all switches
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);

    // First switch should be checked (integration 1 is assigned)
    expect(switches[0].getAttribute('data-state')).toBe('checked');

    // Second switch should be unchecked
    expect(switches[1].getAttribute('data-state')).toBe('unchecked');
  });

  it('sorts integrations alphabetically by name', () => {
    const integrationA = { ...mockIntegration1, name: 'A Integration' };
    const integrationZ = { ...mockIntegration2, name: 'Z Integration' };
    const integrationM = {
      ...mockIntegration1,
      id: 'integration-3',
      name: 'M Integration',
    };

    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [integrationZ, integrationA, integrationM], // Unsorted
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const integrationNames = screen
      .getAllByText(/Integration/)
      .filter((el) => el.getAttribute('data-slot') === 'item-title')
      .map((el) => el.textContent);

    expect(integrationNames).toEqual([
      'A Integration',
      'M Integration',
      'Z Integration',
    ]);
  });

  it('calls assign mutation when toggling on an unassigned integration', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [], // Not assigned
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerAssignMcpIntegration',
    ).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerUnassignMcpIntegration',
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        agentId: 'test-agent-id',
        integrationId: 'integration-1',
      });
    });
  });

  it('calls unassign mutation when toggling off an assigned integration', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [mockIntegration1], // Already assigned
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerAssignMcpIntegration',
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerUnassignMcpIntegration',
    ).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        agentId: 'test-agent-id',
        integrationId: 'integration-1',
      });
    });
  });

  it('disables toggle switches during mutation', () => {
    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerAssignMcpIntegration',
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true, // Mutation in progress
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerUnassignMcpIntegration',
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole('switch');
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
  });

  it('blocks toggling until user-level OAuth authorization is complete', () => {
    const oauthIntegration: McpIntegrationResponseDto = {
      ...mockIntegration1,
      oauth: {
        enabled: true,
        level: 'user',
        authorized: false,
        hasClientCredentials: true,
      } as unknown as McpIntegrationResponseDto['oauth'],
    };

    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [oauthIntegration],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerGetOAuthStatus',
    ).mockReturnValue({
      data: {
        level: 'user',
        authorized: false,
        expiresAt: null,
        scope: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    expect(
      screen.getByText('mcpIntegrations.authorizationRequired'),
    ).toBeTruthy();
    expect(screen.getByText('mcpIntegrations.authorize')).toBeTruthy();

    const toggle = screen.getByRole('switch');
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
  });

  it('has correct ARIA labels for accessibility', () => {
    vi.spyOn(
      apiHooks,
      'useMcpIntegrationsControllerListAvailable',
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      'useAgentMcpIntegrationsControllerListAgentMcpIntegrations',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-label')).toBe(
      'Toggle Test Integration 1 integration',
    );
  });
});
