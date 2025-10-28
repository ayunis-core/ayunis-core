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
- [ ] New "MCP Integrations" card is added to agent configuration page
- [ ] Card follows same design pattern as existing agent config cards (consistent styling, spacing, structure)
- [ ] Card header displays title "MCP Integrations" and description "Connect external MCP servers to extend agent capabilities"
- [ ] Card body displays list of available enabled integrations
- [ ] Each integration item shows: name, description (truncated if long), and toggle switch
- [ ] Empty state UI is displayed when no enabled integrations exist ("No integrations available. Ask your organization admin to set up MCP integrations.")
- [ ] Loading state is displayed while fetching integrations (skeleton loader or spinner)
- [ ] Error state is displayed if fetching fails with retry option

### Display Available Integrations
- [ ] UI fetches and displays all enabled MCP integrations for the organization using `useGetAvailableMcpIntegrations`
- [ ] Only enabled integrations are shown (disabled integrations are filtered out)
- [ ] Integration list is sorted alphabetically by name
- [ ] Each integration displays name prominently (bold or larger font)
- [ ] Each integration displays description below name (muted color, smaller font)
- [ ] Long descriptions are truncated with ellipsis (max 2 lines)
- [ ] Integration items have clear visual separation (borders or spacing)

### Display Current Assignments
- [ ] UI fetches currently assigned integrations for the agent using `useGetAgentMcpIntegrations`
- [ ] Toggle switches reflect current assignment state (on = assigned, off = not assigned)
- [ ] Toggle state is determined by checking if integration ID exists in assigned list
- [ ] UI correctly shows assignment state even after page reload
- [ ] Count of assigned integrations is displayed in card header or badge ("3 connected")

### Toggle Assignment (Assign/Unassign)
- [ ] Each integration has a toggle switch that controls assignment
- [ ] Toggle switch shows current assignment state visually (on/off, color change)
- [ ] Clicking toggle immediately updates UI (optimistic update)
- [ ] Assigning integration calls `useAssignMcpIntegrationToAgent` mutation
- [ ] Unassigning integration calls `useUnassignMcpIntegrationFromAgent` mutation
- [ ] Toggle is disabled while mutation is in flight (prevent double-clicks)
- [ ] Successful assignment shows brief success toast ("Integration connected")
- [ ] Successful unassignment shows brief success toast ("Integration disconnected")
- [ ] Failed mutation reverts toggle state to original position
- [ ] Failed mutation shows error toast with error message
- [ ] Multiple toggles can be operated independently without conflicts

### Optimistic Updates
- [ ] Toggle switch updates immediately on click (before API response)
- [ ] UI assumes mutation will succeed and updates state optimistically
- [ ] Query cache is updated optimistically with new assignment state
- [ ] If mutation fails, UI reverts to previous state automatically
- [ ] If mutation fails, query cache is invalidated to fetch fresh data
- [ ] Optimistic updates provide smooth, responsive user experience

### Error Handling
- [ ] Network errors show toast: "Failed to connect integration. Please try again."
- [ ] Permission errors show toast: "You don't have permission to modify this agent."
- [ ] Integration not found errors show toast: "Integration no longer exists."
- [ ] Generic errors show toast: "An error occurred. Please try again."
- [ ] All error toasts have dismiss button
- [ ] All error toasts auto-dismiss after 5 seconds
- [ ] Errors don't break UI or leave it in inconsistent state

### Data Fetching and State Management
- [ ] Available integrations fetched using `useGetAvailableMcpIntegrations(agentId)` hook
- [ ] Current assignments fetched using `useGetAgentMcpIntegrations(agentId)` hook
- [ ] Both queries run in parallel on component mount
- [ ] Assignment mutations invalidate relevant query caches after success
- [ ] Query cache invalidation triggers automatic refetch of fresh data
- [ ] Loading states are managed independently for initial load vs. mutations
- [ ] Stale data is refetched on window focus (TanStack Query default behavior)

### Integration with Existing Agent Config Page
- [ ] Card integrates seamlessly with existing agent configuration page layout
- [ ] Card respects existing responsive design breakpoints
- [ ] Card maintains consistent spacing with other cards
- [ ] Card doesn't break existing functionality (tools, model settings, etc.)
- [ ] Page layout accommodates new card without layout shifts
- [ ] Navigation and save buttons (if any) remain accessible

### Styling and UX
- [ ] All components use shadcn/ui primitives (Card, Switch, Badge, Label, Separator)
- [ ] UI matches existing Ayunis design system and agent config patterns
- [ ] Toggle switches use consistent colors (green for on, gray for off)
- [ ] Responsive design works on desktop, tablet, and mobile
- [ ] All interactive elements have proper hover/focus states
- [ ] Loading states use consistent skeleton loaders or spinners
- [ ] Toast notifications match app-wide toast styling
- [ ] Card can be collapsed/expanded if other cards have that feature

### Accessibility
- [ ] Toggle switches have proper ARIA labels (integration name)
- [ ] Toggle switches are keyboard accessible (tab navigation, space to toggle)
- [ ] Screen readers announce toggle state changes
- [ ] Focus indicators are visible for all interactive elements
- [ ] Color is not the only indicator of state (use icons or labels too)

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
- [ ] Done

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
