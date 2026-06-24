---
name: new-page
description: Scaffold a new frontend page in ayunis-core. Use when adding a new route with its page component following Feature-Sliced Design conventions.
---

# New Frontend Page — ayunis-core-frontend

## Prerequisites

- Read the `ayunis-core-frontend-dev` skill for validation sequence and FSD rules
- Ensure the dev stack is running (`./dev up` from repo root)

## Working Directory

```bash
cd ayunis-core-frontend
```

## Directory Structure

Every page follows this structure:

```text
src/pages/<page-name>/
├── ui/
│   └── <PageName>Page.tsx       # Main page component (default export)
├── api/                          # Optional: mutation hooks
│   ├── useCreate<Entity>.ts
│   ├── useUpdate<Entity>.ts
│   └── useDelete<Entity>.ts
├── model/                        # Optional: types, constants
│   └── openapi.ts               # Re-exported types from generated API
└── index.ts                      # Barrel export

src/app/routes/_authenticated/
└── <page-name>.index.tsx          # TanStack Router route file
```

## File Templates

### 1. Barrel Export

```typescript
// src/pages/<page-name>/index.ts
export { default as MyPagePage } from './ui/MyPagePage';
```

### 2. Page Component

Pages compose layouts, widgets, and features. They receive data via props (from the route loader) or fetch it internally.

```typescript
// src/pages/<page-name>/ui/MyPagePage.tsx
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { useTranslation } from 'react-i18next';

interface MyPagePageProps {
  items: Item[];
}

export default function MyPagePage({ items }: MyPagePageProps) {
  const { t } = useTranslation('<page-name>');

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader title={t('page.title')} />
        }
        contentArea={
          <div>
            {items.map((item) => (
              <div key={item.id}>{item.name}</div>
            ))}
          </div>
        }
      />
    </AppLayout>
  );
}
```

### 3. Route File

Routes use TanStack Router's `createFileRoute`. Data fetching happens in the `loader`.

```typescript
// src/app/routes/_authenticated/<page-name>.index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { MyPagePage } from '@/pages/<page-name>';
import {
  getMyEntitiesControllerFindAllQueryKey,
  myEntitiesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/<page-name>/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const items = await queryClient.fetchQuery({
      queryKey: getMyEntitiesControllerFindAllQueryKey(),
      queryFn: () => myEntitiesControllerFindAll(),
    });
    return { items };
  },
});

function RouteComponent() {
  const { items } = Route.useLoaderData();
  return <MyPagePage items={items} />;
}
```

For routes with URL parameters:

```typescript
// src/app/routes/_authenticated/<page-name>.$id.tsx
import { createFileRoute } from '@tanstack/react-router';
import { MyDetailPage } from '@/pages/<page-name>';
import {
  getMyEntitiesControllerFindOneQueryKey,
  myEntitiesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/<page-name>/$id')({
  component: RouteComponent,
  loader: async ({ params: { id }, context: { queryClient } }) => {
    const item = await queryClient.fetchQuery({
      queryKey: getMyEntitiesControllerFindOneQueryKey(id),
      queryFn: () => myEntitiesControllerFindOne(id),
    });
    return { item };
  },
});

function RouteComponent() {
  const { item } = Route.useLoaderData();
  return <MyDetailPage item={item} />;
}
```

For routes with search params:

```typescript
// src/app/routes/_authenticated/<page-name>.tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { MyPagePage } from '@/pages/<page-name>';

const searchSchema = z.object({
  filter: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/<page-name>')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { filter } = Route.useSearch();
  return <MyPagePage filter={filter} />;
}
```

### 4. Mutation Hooks (Optional)

One hook per operation. Each encapsulates a TanStack Query mutation with cache invalidation.

```typescript
// src/pages/<page-name>/api/useCreateMyEntity.ts
import {
  useMyEntitiesControllerCreate,
  getMyEntitiesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useCreateMyEntity(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('<page-name>');

  const mutation = useMyEntitiesControllerCreate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMyEntitiesControllerFindAllQueryKey(),
        });
        toast.success(t('toast.createSuccess'));
        onSuccess?.();
      },
      onError: () => {
        toast.error(t('toast.createError'));
      },
    },
  });

  return {
    createMyEntity: (data: { name: string }) =>
      mutation.mutate({ data }),
    isCreating: mutation.isPending,
  };
}
```

### 5. Model Types (Optional)

Re-export types from the generated API client for cleaner imports within the page module.

```typescript
// src/pages/<page-name>/model/openapi.ts
export type {
  MyEntityResponseDto as MyEntity,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
```

## Internationalization

Add translation keys for the new page:

```bash
# Create translation files
# src/shared/i18n/locales/de/<page-name>.json
# src/shared/i18n/locales/en/<page-name>.json
```

```json
{
  "page": {
    "title": "My Page"
  },
  "toast": {
    "createSuccess": "Created successfully",
    "createError": "Failed to create"
  }
}
```

Register the namespace in `src/shared/i18n/i18n.ts`.

## FSD Import Rules

Pages sit at the top of the dependency hierarchy:

```text
pages → widgets → features → shared
```

A page **can** import from:

- `@/widgets/*` — Composite UI components
- `@/features/*` — Business logic features
- `@/shared/*` — Primitives (UI, API, lib, i18n)
- `@/layouts/*` — Layout components

A page **cannot** import from:

- Other pages (`@/pages/*`) — pages are siblings, never dependencies
- `@/app/*` — the app layer is above pages

## Available Layouts

| Layout | Use Case |
|--------|----------|
| `AppLayout` | Standard authenticated page with sidebar |
| `ContentAreaLayout` | Page with header + scrollable content area |
| `FullScreenMessageLayout` | Centered message (empty states, errors) |
| `ChatInterfaceLayout` | Chat conversation layout with input area |

## Scaffold Checklist

1. **Create page files**:
   - [ ] `src/pages/<page-name>/ui/<PageName>Page.tsx`
   - [ ] `src/pages/<page-name>/index.ts`
   - [ ] `src/app/routes/_authenticated/<page-name>.index.tsx`

2. **Create translations** (if using i18n):
   - [ ] `src/shared/i18n/locales/de/<page-name>.json`
   - [ ] `src/shared/i18n/locales/en/<page-name>.json`
   - [ ] Register namespace in `src/shared/i18n/i18n.ts`

3. **Regenerate route tree**:

   ```bash
   npx tsr generate
   ```

   This updates `src/app/routeTree.gen.ts` automatically.

4. **Validate**:

   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```

5. **Visual check**: Navigate to the new route in the browser and verify it renders.

## Reference Pages

Study these existing pages as examples:

- **Simple list page**: `src/pages/agents/` — list with tabs, create dialog
- **Detail page with params**: `src/pages/agent/` — single entity view with `$id` param
- **Search params**: `src/pages/install/` — page with search schema validation
- **Settings sub-pages**: `src/pages/settings/` — nested layout with multiple sub-routes
- **Data loading in route**: `src/app/routes/_authenticated/prompts.index.tsx` — loader pattern with query prefetch
