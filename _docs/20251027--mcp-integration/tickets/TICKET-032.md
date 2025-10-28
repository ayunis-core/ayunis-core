# TICKET-032: Implement MCP Integration Admin UI

## Description

Create the organization admin interface for managing MCP integrations. This UI allows organization administrators to view, create, edit, enable/disable, delete, and validate MCP integrations for their organization.

**What needs to be built:**
A comprehensive admin UI with the following capabilities:
1. **List view**: Display all MCP integrations in a table/card layout
2. **Create predefined integration**: Modal/dialog to select from available predefined configs and provide authentication
3. **Create custom integration**: Modal/dialog to enter custom MCP server URL and authentication details
4. **Edit integration**: Modal/dialog to update integration name and authentication credentials
5. **Enable/disable toggle**: Quick action to enable or disable an integration
6. **Delete integration**: Action with confirmation dialog to permanently remove an integration
7. **Validate integration**: Test connection button that displays validation results (capability counts, success/failure status)
8. **Authorization**: UI should check if user has admin role and hide/disable admin actions for non-admins

**Why it's needed:**
Organization administrators need a user-friendly interface to manage their MCP server integrations. This is the primary management interface for the MCP integration feature and must be intuitive and robust.

**Technical approach:**
- Follow Feature-Sliced Design (FSD) architecture
- Create feature in `src/features/mcp-integrations/` or page in `src/pages/mcp-integrations/`
- Use Orval-generated hooks from TICKET-034
- Use shadcn/ui components (Table, Card, Dialog, Form, Button, Badge, etc.)
- Form validation with Zod schemas matching backend DTOs
- TanStack Query for data fetching with automatic refetching and cache invalidation
- Optimistic updates for enable/disable toggles
- Error handling via toast notifications
- Route under organization settings or standalone `/integrations` route

**Location in app:**
- Primary option: Dedicated page at `/settings/integrations` or `/integrations`
- Alternative: Section within organization settings page
- Must be accessible only to organization admins (check user role from auth context)

## Acceptance Criteria

### UI Components and Layout
- [ ] MCP Integrations page/section is accessible from navigation (settings menu or sidebar)
- [ ] Page displays list of all MCP integrations for the current organization
- [ ] List shows integration name, type (predefined/custom), status (enabled/disabled), and capabilities count
- [ ] List supports both table and card view layouts (table for desktop, cards for mobile)
- [ ] Empty state UI is displayed when no integrations exist ("No integrations yet. Create your first integration to get started.")
- [ ] Loading state is displayed while fetching integrations
- [ ] Error state is displayed if fetching fails with retry option

### Create Predefined Integration
- [ ] "Add Predefined Integration" button opens a dialog/modal
- [ ] Dialog displays list of available predefined configs (name, description, auth type)
- [ ] User can select a predefined config from the list
- [ ] Form displays fields for name and authentication based on selected config's auth type
- [ ] Form validation ensures name is required and auth fields match requirements
- [ ] Form validates that name is unique within organization
- [ ] Submit button is disabled until form is valid
- [ ] Successful creation shows success toast and closes dialog
- [ ] Integration list automatically updates after creation (cache invalidation)
- [ ] Form errors are displayed inline for each field
- [ ] API errors are displayed in toast notifications

### Create Custom Integration
- [ ] "Add Custom Integration" button opens a dialog/modal
- [ ] Form includes fields: name (required), server URL (required, valid URL), auth type (select), auth credentials (conditional fields based on auth type)
- [ ] Auth type selection dynamically shows/hides relevant credential fields (API key, OAuth, Basic Auth)
- [ ] Form validation ensures all required fields are filled correctly
- [ ] Form validates URL format and that name is unique
- [ ] Submit button is disabled until form is valid
- [ ] Successful creation shows success toast and closes dialog
- [ ] Integration list automatically updates after creation
- [ ] Form errors are displayed inline for each field
- [ ] API errors are displayed in toast notifications

### Edit Integration
- [ ] Each integration has an "Edit" action button/menu item
- [ ] Edit button opens dialog pre-filled with current integration data
- [ ] User can update name and authentication credentials (cannot change type or URL for predefined)
- [ ] Form validation matches create form requirements
- [ ] Submit button is disabled until form is valid and changes are made
- [ ] Successful update shows success toast and closes dialog
- [ ] Integration list automatically updates after edit (cache invalidation)
- [ ] Form errors are displayed inline
- [ ] API errors are displayed in toast notifications

### Enable/Disable Integration
- [ ] Each integration has an enable/disable toggle switch or button
- [ ] Toggle shows current state visually (enabled = green/on, disabled = gray/off)
- [ ] Clicking toggle immediately updates UI (optimistic update)
- [ ] Successful toggle shows brief success toast
- [ ] Failed toggle reverts UI and shows error toast
- [ ] Toggle is disabled while request is in flight
- [ ] Integration list reflects updated status after toggle

### Delete Integration
- [ ] Each integration has a "Delete" action button/menu item
- [ ] Delete button opens confirmation dialog ("Are you sure you want to delete [name]? This action cannot be undone.")
- [ ] Confirmation dialog has "Cancel" and "Delete" buttons
- [ ] Delete button in dialog is styled as destructive (red)
- [ ] Successful deletion shows success toast and removes integration from list
- [ ] Failed deletion shows error toast and keeps integration in list
- [ ] Integration list automatically updates after deletion (cache invalidation)

### Validate Integration
- [ ] Each integration has a "Test Connection" or "Validate" button
- [ ] Clicking validate button disables the button and shows loading indicator
- [ ] Successful validation shows success toast with capability counts ("Connected successfully. Found X prompts, Y resources, Z tools.")
- [ ] Failed validation shows error toast with error message
- [ ] Validation results are displayed inline in the integration card/row (optional enhancement)
- [ ] Validation button re-enables after response

### Authorization
- [ ] Page/section is only accessible to users with admin role in their organization
- [ ] Non-admin users see "Access Denied" message or are redirected
- [ ] All create/edit/delete/enable/disable actions are hidden or disabled for non-admin users
- [ ] Authorization check happens on page load using auth context

### Forms and Validation
- [ ] All forms use Zod schemas that match backend DTOs exactly
- [ ] Zod schemas validate:
  - Name: required, string, 1-255 characters
  - Server URL: required, valid URL format
  - Auth type: required, one of allowed enum values
  - Auth credentials: required based on auth type, proper format
- [ ] Form errors display immediately on blur or submit attempt
- [ ] Forms disable submit button while request is in flight
- [ ] Forms reset/close on successful submission
- [ ] Forms remain open on error to allow correction

### Data Fetching and State Management
- [ ] Integration list uses `useListOrgIntegrations` hook with automatic refetching
- [ ] Predefined configs list uses `useListPredefinedConfigs` hook
- [ ] All mutations (create, update, delete, enable, disable, validate) invalidate relevant query caches
- [ ] Loading states are shown during all async operations
- [ ] Error states allow retry actions
- [ ] Optimistic updates are used for enable/disable toggles
- [ ] Query cache is properly configured for automatic background refetching

### Styling and UX
- [ ] All components use shadcn/ui primitives (Button, Card, Table, Dialog, Form, Input, Select, Switch, Badge, etc.)
- [ ] UI matches existing Ayunis design system and patterns
- [ ] Responsive design works on desktop, tablet, and mobile
- [ ] All interactive elements have proper hover/focus states
- [ ] Loading indicators are clear and consistent
- [ ] Toast notifications auto-dismiss after 5 seconds
- [ ] Dialogs can be closed via X button, Cancel button, or ESC key
- [ ] Form inputs have proper labels, placeholders, and help text

### Testing
- [ ] Unit tests for all form validation logic (Zod schemas)
- [ ] Unit tests for component rendering and user interactions
- [ ] Unit tests verify correct hooks are called with correct parameters
- [ ] Unit tests verify optimistic updates and cache invalidation
- [ ] Unit tests verify authorization checks (admin-only access)
- [ ] Tests cover happy paths and error scenarios
- [ ] Tests verify toast notifications are shown for success/error cases
- [ ] Tests verify dialogs open/close correctly
- [ ] All tests pass: `npm run test`

## Dependencies

- TICKET-034 (Regenerate Frontend API Client - must be completed first)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Large

## Technical Notes

**File structure (Feature-Sliced Design):**
```
src/features/mcp-integrations/
├── ui/
│   ├── mcp-integrations-page.tsx           # Main page component
│   ├── integrations-list.tsx               # List/table component
│   ├── integration-card.tsx                # Card component for list item
│   ├── create-predefined-dialog.tsx        # Dialog for creating predefined integration
│   ├── create-custom-dialog.tsx            # Dialog for creating custom integration
│   ├── edit-integration-dialog.tsx         # Dialog for editing integration
│   ├── delete-confirmation-dialog.tsx      # Confirmation dialog for deletion
│   └── validation-result-display.tsx       # Component to display validation results
├── model/
│   ├── schemas.ts                          # Zod validation schemas
│   └── types.ts                            # TypeScript types/interfaces
└── lib/
    └── helpers.ts                          # Helper functions (formatting, etc.)
```

**Alternative structure (if part of settings page):**
```
src/pages/settings/
├── ui/
│   ├── settings-page.tsx
│   └── integrations-section.tsx            # MCP integrations section
└── ...
```

**Orval-generated hooks to use:**
```typescript
import {
  useListOrgIntegrations,
  useListPredefinedConfigs,
  useCreatePredefinedIntegration,
  useCreateCustomIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useEnableIntegration,
  useDisableIntegration,
  useValidateIntegration,
} from '@/shared/api/generated/mcp-integrations';
```

**Zod schema example:**
```typescript
import { z } from 'zod';

export const createPredefinedIntegrationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  predefinedConfigId: z.string().uuid('Invalid config ID'),
  authConfig: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('none'),
    }),
    z.object({
      type: z.literal('api_key'),
      apiKey: z.string().min(1, 'API key is required'),
    }),
    z.object({
      type: z.literal('oauth'),
      accessToken: z.string().min(1, 'Access token is required'),
      refreshToken: z.string().optional(),
    }),
    z.object({
      type: z.literal('basic'),
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    }),
  ]),
});
```

**TanStack Query usage pattern:**
```typescript
const { data: integrations, isLoading, error } = useListOrgIntegrations({
  query: {
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  },
});

const createMutation = useCreatePredefinedIntegration({
  mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries(['listOrgIntegrations']);
      toast.success('Integration created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create integration: ${error.message}`);
    },
  },
});
```

**Authorization check example:**
```typescript
import { useAuth } from '@/shared/auth/hooks/use-auth';

const { user } = useAuth();
const isAdmin = user?.role === 'admin';

if (!isAdmin) {
  return <AccessDenied />;
}
```

**shadcn/ui components to use:**
- Button, Card, Table, Dialog, Form, Input, Select, Switch, Badge, Label, Separator
- AlertDialog for delete confirmation
- Tabs (if adding multiple views)
- Dropdown Menu for actions

**Responsive design:**
- Desktop: Table view with all columns
- Tablet: Card grid view
- Mobile: Stacked card list

**Validation display pattern:**
```typescript
{validationResult && (
  <div className={validationResult.isValid ? 'text-green-600' : 'text-red-600'}>
    {validationResult.isValid ? (
      <div>
        <CheckIcon className="inline" /> Connected successfully
        <div className="text-sm mt-1">
          {validationResult.capabilities.prompts} prompts,
          {validationResult.capabilities.resources} resources,
          {validationResult.capabilities.tools} tools
        </div>
      </div>
    ) : (
      <div>
        <XIcon className="inline" /> Connection failed: {validationResult.error}
      </div>
    )}
  </div>
)}
```

**Testing approach:**
- Use Vitest with React Testing Library
- Mock Orval-generated hooks using `vi.mock()`
- Test form validation by submitting with invalid data
- Test optimistic updates by mocking mutation responses
- Test authorization by mocking user context with different roles

**Common pitfalls to avoid:**
- Don't forget to invalidate query cache after mutations
- Don't forget to handle loading and error states
- Don't forget to disable buttons during async operations
- Don't forget to validate forms on both client and server side
- Don't forget to show user feedback (toasts) for all actions
- Don't forget to handle dialog close on successful submission
