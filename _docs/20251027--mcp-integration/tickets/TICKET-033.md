# TICKET-033: Implement Agent MCP Assignment UI

## Description

Create the user interface for assigning MCP integrations to agents. This UI allows users to view available enabled MCP integrations for their organization and assign/unassign them to specific agents via toggle switches.

**What needs to be built:**
A new "MCP Integrations" card/section on the agent configuration page with the following capabilities:
1. **List available integrations**: Display all enabled MCP integrations for the organization
2. **Show current assignments**: Indicate which integrations are currently assigned to the agent
3. **Toggle assignment**: Provide toggle switches to assign/unassign integrations
4. **Optimistic updates**: Update UI immediately when toggling, with rollback on error
5. **Visual feedback**: Show integration name, description, and assignment status
6. **Error handling**: Display toast notifications for errors

**Why it's needed:**
Users need a simple, intuitive way to connect their agents to MCP server integrations. This enables agents to access additional tools, prompts, and resources provided by MCP servers.

**Technical approach:**
- Add new card/section to existing agent configuration page
- Follow same UI patterns as existing agent config cards (Tools, Model Settings, RAG Sources)
- Use Orval-generated hooks from TICKET-034
- Use shadcn/ui components (Card, Switch, Badge)
- TanStack Query for data fetching with cache management
- Optimistic updates for immediate feedback on toggle
- Revert UI state if API request fails
- Error handling via toast notifications

**Location in app:**
- Agent configuration page (e.g., `/agents/:agentId/settings` or `/agents/:agentId/edit`)
- New card titled "MCP Integrations" or "External Integrations"
- Positioned alongside existing cards (Tools, Model, etc.)

## Acceptance Criteria

### UI Components and Layout
- [x] New "MCP Integrations" card is added to agent configuration page
- [x] Card follows same design pattern as existing agent config cards (consistent styling, spacing, structure)
- [x] Card header displays title "MCP Integrations" and description "Connect external MCP servers to extend agent capabilities"
- [x] Card body displays list of available enabled integrations
- [x] Each integration item shows: name, description (truncated if long), and toggle switch
- [x] Empty state UI is displayed when no enabled integrations exist ("No integrations available. Ask your organization admin to set up MCP integrations.")
- [x] Loading state is displayed while fetching integrations (skeleton loader or spinner)
- [x] Error state is displayed if fetching fails with retry option

### Display Available Integrations
- [x] UI fetches and displays all enabled MCP integrations for the organization using `useGetAvailableMcpIntegrations`
- [x] Only enabled integrations are shown (disabled integrations are filtered out)
- [x] Integration list is sorted alphabetically by name
- [x] Each integration displays name prominently (bold or larger font)
- [x] Each integration displays description below name (muted color, smaller font)
- [x] Long descriptions are truncated with ellipsis (max 2 lines)
- [x] Integration items have clear visual separation (borders or spacing)

### Display Current Assignments
- [x] UI fetches currently assigned integrations for the agent using `useGetAgentMcpIntegrations`
- [x] Toggle switches reflect current assignment state (on = assigned, off = not assigned)
- [x] Toggle state is determined by checking if integration ID exists in assigned list
- [x] UI correctly shows assignment state even after page reload
- [x] Count of assigned integrations is displayed in card header or badge ("3 connected")

### Toggle Assignment (Assign/Unassign)
- [x] Each integration has a toggle switch that controls assignment
- [x] Toggle switch shows current assignment state visually (on/off, color change)
- [x] Clicking toggle immediately updates UI (optimistic update)
- [x] Assigning integration calls `useAssignMcpIntegrationToAgent` mutation
- [x] Unassigning integration calls `useUnassignMcpIntegrationFromAgent` mutation
- [x] Toggle is disabled while mutation is in flight (prevent double-clicks)
- [x] Successful assignment shows brief success toast ("Integration connected")
- [x] Successful unassignment shows brief success toast ("Integration disconnected")
- [x] Failed mutation reverts toggle state to original position
- [x] Failed mutation shows error toast with error message
- [x] Multiple toggles can be operated independently without conflicts

### Optimistic Updates
- [x] Toggle switch updates immediately on click (before API response)
- [x] UI assumes mutation will succeed and updates state optimistically
- [x] Query cache is updated optimistically with new assignment state
- [x] If mutation fails, UI reverts to previous state automatically
- [x] If mutation fails, query cache is invalidated to fetch fresh data
- [x] Optimistic updates provide smooth, responsive user experience

### Error Handling
- [x] Network errors show toast: "Failed to connect integration. Please try again."
- [x] Permission errors show toast: "You don't have permission to modify this agent."
- [x] Integration not found errors show toast: "Integration no longer exists."
- [x] Generic errors show toast: "An error occurred. Please try again."
- [x] All error toasts have dismiss button
- [x] All error toasts auto-dismiss after 5 seconds
- [x] Errors don't break UI or leave it in inconsistent state

### Data Fetching and State Management
- [x] Available integrations fetched using `useGetAvailableMcpIntegrations(agentId)` hook
- [x] Current assignments fetched using `useGetAgentMcpIntegrations(agentId)` hook
- [x] Both queries run in parallel on component mount
- [x] Assignment mutations invalidate relevant query caches after success
- [x] Query cache invalidation triggers automatic refetch of fresh data
- [x] Loading states are managed independently for initial load vs. mutations
- [x] Stale data is refetched on window focus (TanStack Query default behavior)

### Integration with Existing Agent Config Page
- [x] Card integrates seamlessly with existing agent configuration page layout
- [x] Card respects existing responsive design breakpoints
- [x] Card maintains consistent spacing with other cards
- [x] Card doesn't break existing functionality (tools, model settings, etc.)
- [x] Page layout accommodates new card without layout shifts
- [x] Navigation and save buttons (if any) remain accessible

### Styling and UX
- [x] All components use shadcn/ui primitives (Card, Switch, Badge, Label, Separator)
- [x] UI matches existing Ayunis design system and agent config patterns
- [x] Toggle switches use consistent colors (green for on, gray for off)
- [x] Responsive design works on desktop, tablet, and mobile
- [x] All interactive elements have proper hover/focus states
- [x] Loading states use consistent skeleton loaders or spinners
- [x] Toast notifications match app-wide toast styling
- [x] Card can be collapsed/expanded if other cards have that feature

### Accessibility
- [x] Toggle switches have proper ARIA labels (integration name)
- [x] Toggle switches are keyboard accessible (tab navigation, space to toggle)
- [x] Screen readers announce toggle state changes
- [x] Focus indicators are visible for all interactive elements
- [x] Color is not the only indicator of state (use icons or labels too)

### Testing
- [ ] Unit tests for component rendering with mock data
- [ ] Unit tests verify correct hooks are called with agent ID parameter
- [ ] Unit tests verify toggle switches reflect assignment state correctly
- [ ] Unit tests verify optimistic updates work correctly
- [ ] Unit tests verify rollback on mutation failure
- [ ] Unit tests verify toast notifications appear for success/error cases
- [ ] Unit tests verify empty state displays when no integrations exist
- [ ] Unit tests verify loading state displays during data fetch
- [ ] Unit tests verify error state displays on fetch failure
- [ ] Tests cover edge cases (no integrations, all assigned, none assigned)
- [ ] All tests pass: `npm run test`

## Dependencies

- TICKET-034 (Regenerate Frontend API Client - must be completed first)

## Status

- [x] To Do
- [ ] In Progress
- [x] Done (UI implementation complete, tests skipped as per request)

## Complexity

Medium

## Technical Notes

**File structure (integrate into existing agent pages):**
```
src/pages/agents/
├── ui/
│   ├── agent-config-page.tsx               # Existing agent config page
│   ├── mcp-integrations-card.tsx           # NEW: MCP integrations card
│   ├── integration-toggle-item.tsx         # NEW: Individual integration toggle
│   └── ... (existing components)
└── ...
```

**Alternative structure (if using features):**
```
src/features/agent-mcp-assignment/
├── ui/
│   ├── mcp-integrations-card.tsx           # Main card component
│   └── integration-toggle-item.tsx         # Individual integration item
└── lib/
    └── helpers.ts                          # Helper functions
```

**Orval-generated hooks to use:**
```typescript
import {
  useGetAvailableMcpIntegrations,
  useGetAgentMcpIntegrations,
  useAssignMcpIntegrationToAgent,
  useUnassignMcpIntegrationFromAgent,
} from '@/shared/api/generated/agents-mcp';
```

**Component implementation example:**
```typescript
import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Card } from '@/shared/ui/card';
import { Switch } from '@/shared/ui/switch';
import { toast } from '@/shared/ui/use-toast';
import {
  useGetAvailableMcpIntegrations,
  useGetAgentMcpIntegrations,
  useAssignMcpIntegrationToAgent,
  useUnassignMcpIntegrationFromAgent,
} from '@/shared/api/generated/agents-mcp';

export function McpIntegrationsCard() {
  const { agentId } = useParams({ from: '/agents/$agentId' });

  // Fetch available and assigned integrations
  const { data: available, isLoading: loadingAvailable } = useGetAvailableMcpIntegrations(agentId);
  const { data: assigned, isLoading: loadingAssigned } = useGetAgentMcpIntegrations(agentId);

  // Mutation hooks
  const assignMutation = useAssignMcpIntegrationToAgent({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Integration connected' });
      },
      onError: (error) => {
        toast({ title: 'Failed to connect integration', variant: 'destructive' });
      },
    },
  });

  const unassignMutation = useUnassignMcpIntegrationFromAgent({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Integration disconnected' });
      },
      onError: (error) => {
        toast({ title: 'Failed to disconnect integration', variant: 'destructive' });
      },
    },
  });

  // Check if integration is assigned
  const isAssigned = (integrationId: string) => {
    return assigned?.some(a => a.id === integrationId) ?? false;
  };

  // Handle toggle
  const handleToggle = async (integrationId: string, currentState: boolean) => {
    if (currentState) {
      // Unassign
      await unassignMutation.mutateAsync({ agentId, integrationId });
    } else {
      // Assign
      await assignMutation.mutateAsync({ agentId, integrationId });
    }
  };

  if (loadingAvailable || loadingAssigned) {
    return <Card>Loading...</Card>;
  }

  if (!available || available.length === 0) {
    return (
      <Card>
        <p>No integrations available. Ask your organization admin to set up MCP integrations.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3>MCP Integrations</h3>
      <p>Connect external MCP servers to extend agent capabilities</p>
      {available.map(integration => (
        <div key={integration.id}>
          <div>
            <strong>{integration.name}</strong>
            <p>{integration.description}</p>
          </div>
          <Switch
            checked={isAssigned(integration.id)}
            onCheckedChange={() => handleToggle(integration.id, isAssigned(integration.id))}
            disabled={assignMutation.isPending || unassignMutation.isPending}
          />
        </div>
      ))}
    </Card>
  );
}
```

**Optimistic update pattern with TanStack Query:**
```typescript
const assignMutation = useAssignMcpIntegrationToAgent({
  mutation: {
    onMutate: async ({ agentId, integrationId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['getAgentMcpIntegrations', agentId]);

      // Snapshot previous value
      const previousAssignments = queryClient.getQueryData(['getAgentMcpIntegrations', agentId]);

      // Optimistically update
      queryClient.setQueryData(['getAgentMcpIntegrations', agentId], (old) => {
        // Add integration to assigned list
        return [...old, { id: integrationId }];
      });

      // Return context with snapshot
      return { previousAssignments };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousAssignments) {
        queryClient.setQueryData(
          ['getAgentMcpIntegrations', variables.agentId],
          context.previousAssignments
        );
      }
      toast({ title: 'Failed to connect integration', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Integration connected' });
    },
    onSettled: (data, error, variables) => {
      // Always refetch after mutation
      queryClient.invalidateQueries(['getAgentMcpIntegrations', variables.agentId]);
    },
  },
});
```

**Integration with existing agent config page:**
```typescript
// In agent-config-page.tsx
import { McpIntegrationsCard } from './mcp-integrations-card';

export function AgentConfigPage() {
  return (
    <div>
      <ModelSettingsCard />
      <ToolsCard />
      <McpIntegrationsCard /> {/* NEW */}
      <RagSourcesCard />
      {/* ... other cards */}
    </div>
  );
}
```

**shadcn/ui components to use:**
- Card (CardHeader, CardTitle, CardDescription, CardContent)
- Switch (toggle switch)
- Badge (for showing count of connected integrations)
- Separator (divider between integration items)
- Skeleton (loading state)

**Empty state component:**
```typescript
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <PlugIcon className="h-12 w-12 text-muted-foreground mb-4" />
      <h4 className="text-lg font-semibold mb-2">No integrations available</h4>
      <p className="text-sm text-muted-foreground max-w-md">
        Ask your organization admin to set up MCP integrations in organization settings.
      </p>
    </div>
  );
}
```

**Testing approach:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { McpIntegrationsCard } from './mcp-integrations-card';

// Mock hooks
vi.mock('@/shared/api/generated/agents-mcp', () => ({
  useGetAvailableMcpIntegrations: vi.fn(),
  useGetAgentMcpIntegrations: vi.fn(),
  useAssignMcpIntegrationToAgent: vi.fn(),
  useUnassignMcpIntegrationFromAgent: vi.fn(),
}));

describe('McpIntegrationsCard', () => {
  it('renders available integrations', () => {
    // Setup mocks
    useGetAvailableMcpIntegrations.mockReturnValue({
      data: [{ id: '1', name: 'Test Integration', description: 'Test' }],
      isLoading: false,
    });

    render(<McpIntegrationsCard />);

    expect(screen.getByText('Test Integration')).toBeInTheDocument();
  });

  it('toggles integration assignment', async () => {
    // Setup mocks with mutations
    const assignMutate = vi.fn();
    useAssignMcpIntegrationToAgent.mockReturnValue({
      mutateAsync: assignMutate,
      isPending: false,
    });

    render(<McpIntegrationsCard />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(assignMutate).toHaveBeenCalledWith({
        agentId: expect.any(String),
        integrationId: '1',
      });
    });
  });

  it('shows empty state when no integrations', () => {
    useGetAvailableMcpIntegrations.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<McpIntegrationsCard />);

    expect(screen.getByText(/No integrations available/i)).toBeInTheDocument();
  });
});
```

**Common pitfalls to avoid:**
- Don't forget to pass agentId parameter to all hooks
- Don't forget to invalidate query cache after mutations
- Don't forget to handle loading and error states
- Don't forget to disable toggles during mutations
- Don't forget to implement optimistic updates for better UX
- Don't forget to rollback UI state on mutation failure
- Don't forget to show toast notifications for all actions
- Don't forget to filter out disabled integrations from available list
- Don't forget to match styling of existing agent config cards
