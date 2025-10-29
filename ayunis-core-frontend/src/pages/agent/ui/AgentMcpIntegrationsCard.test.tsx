import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AgentMcpIntegrationsCard from "./AgentMcpIntegrationsCard";
import * as apiHooks from "@/shared/api/generated/ayunisCoreAPI";
import type { McpIntegrationResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

// Mock modules
vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn(() => ({ id: "test-agent-id" })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      // Simple mock that handles interpolation
      if (key === "mcpIntegrations.connectedCount") {
        return `${params?.count} connected`;
      }
      if (key === "mcpIntegrations.toggleAriaLabel") {
        return `Toggle ${params?.name} integration`;
      }
      // Return the key for other translations
      return key;
    },
  }),
}));

vi.mock("@/shared/lib/toast", () => ({
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
  id: "integration-1",
  name: "Test Integration 1",
  type: "predefined" as const,
  slug: "test-integration-1",
  enabled: true,
  organizationId: "org-1",
  hasCredentials: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const mockIntegration2: McpIntegrationResponseDto = {
  id: "integration-2",
  name: "Test Integration 2",
  type: "custom" as const,
  serverUrl: "http://example.com",
  enabled: true,
  organizationId: "org-1",
  hasCredentials: false,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("AgentMcpIntegrationsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Mock hooks to return loading state
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    expect(
      screen.getByText("mcpIntegrations.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("mcpIntegrations.description")
    ).toBeInTheDocument();
    // Loading skeletons should be present
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when no integrations are available", () => {
    // Mock hooks to return empty data
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    expect(
      screen.getByText("mcpIntegrations.emptyState.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("mcpIntegrations.emptyState.description")
    ).toBeInTheDocument();
  });

  it("renders error state when fetching fails", () => {
    const mockRefetch = vi.fn();

    // Mock hooks to return error state
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    expect(
      screen.getByText("mcpIntegrations.errors.failedToLoad")
    ).toBeInTheDocument();
    expect(
      screen.getByText("mcpIntegrations.retryButton")
    ).toBeInTheDocument();

    // Test retry button
    const retryButton = screen.getByText("mcpIntegrations.retryButton");
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("renders available integrations with correct data", () => {
    // Mock hooks to return integrations
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1, mockIntegration2],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    // Check if both integrations are rendered
    expect(screen.getByText("Test Integration 1")).toBeInTheDocument();
    expect(screen.getByText("Test Integration 2")).toBeInTheDocument();

    // Check if slug and serverUrl are displayed
    expect(screen.getByText("test-integration-1")).toBeInTheDocument();
    expect(screen.getByText("http://example.com")).toBeInTheDocument();

    // Check if types are displayed as badges
    expect(screen.getByText("predefined")).toBeInTheDocument();
    expect(screen.getByText("custom")).toBeInTheDocument();
  });

  it("displays correct toggle state for assigned integrations", () => {
    // Mock hooks with one integration assigned
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1, mockIntegration2],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1], // Only integration 1 is assigned
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    // Get all switches
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);

    // First switch should be checked (integration 1 is assigned)
    expect(switches[0]).toHaveAttribute("data-state", "checked");

    // Second switch should be unchecked
    expect(switches[1]).toHaveAttribute("data-state", "unchecked");
  });

  it("displays connected count badge when integrations are assigned", () => {
    // Mock hooks with two integrations assigned
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1, mockIntegration2],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1, mockIntegration2],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    expect(screen.getByText("2 connected")).toBeInTheDocument();
  });

  it("sorts integrations alphabetically by name", () => {
    const integrationA = { ...mockIntegration1, name: "A Integration" };
    const integrationZ = { ...mockIntegration2, name: "Z Integration" };
    const integrationM = {
      ...mockIntegration1,
      id: "integration-3",
      name: "M Integration",
    };

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [integrationZ, integrationA, integrationM], // Unsorted
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const integrationNames = screen
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.textContent);

    expect(integrationNames).toEqual([
      "A Integration",
      "M Integration",
      "Z Integration",
    ]);
  });

  it("calls assign mutation when toggling on an unassigned integration", async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [], // Not assigned
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerAssignMcpIntegration"
    ).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerUnassignMcpIntegration"
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        agentId: "test-agent-id",
        integrationId: "integration-1",
      });
    });
  });

  it("calls unassign mutation when toggling off an assigned integration", async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1], // Already assigned
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerAssignMcpIntegration"
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerUnassignMcpIntegration"
    ).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        agentId: "test-agent-id",
        integrationId: "integration-1",
      });
    });
  });

  it("disables toggle switches during mutation", () => {
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerAssignMcpIntegration"
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true, // Mutation in progress
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerUnassignMcpIntegration"
    ).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeDisabled();
  });

  it("has correct ARIA labels for accessibility", () => {
    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAvailableMcpIntegrations"
    ).mockReturnValue({
      data: [mockIntegration1],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(
      apiHooks,
      "useAgentsControllerListAgentMcpIntegrations"
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentMcpIntegrationsCard />, { wrapper: createWrapper() });

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute(
      "aria-label",
      "Toggle Test Integration 1 integration"
    );
  });
});
