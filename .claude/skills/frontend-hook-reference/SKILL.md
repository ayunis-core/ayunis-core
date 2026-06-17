---
name: frontend-hook-reference
description: "Reference implementation for frontend data hooks (queries and mutations). MUST be loaded when creating or modifying any hook in an api/ directory or any use*.ts file that calls the generated API client."
---

# Frontend Hook Reference Implementation

This skill defines the canonical patterns for data-access hooks. Every hook that calls the API MUST follow these patterns.

## Utilities

- **`extractErrorData`** from `@/shared/api/extract-error-data` — extracts `{ code, message, status, errors }` from Axios errors. Throws if the error is not an `AxiosError` (network failure, cancellation, etc.).
- **`showSuccess` / `showError`** from `@/shared/lib/toast` — user-facing toasts.
- All user-facing strings use `useTranslation` with the appropriate namespace.

## Pattern 1: Mutation Hook (no form)

For simple actions (delete, toggle, assign, unassign).

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  entityControllerDelete,
  getEntityControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

interface DeleteEntityParams {
  id: string;
}

export function useDeleteEntity() {
  const { t } = useTranslation('entities');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id }: DeleteEntityParams) => {
      await entityControllerDelete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getEntityControllerFindAllQueryKey(),
      });
      void router.invalidate();
      showSuccess(t('delete.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'ENTITY_NOT_FOUND':
            showError(t('delete.notFound'));
            break;
          default:
            showError(t('delete.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('delete.error'));
      }
    },
  });
}
```

## Pattern 2: Mutation Hook (with form)

For create/update operations that use `react-hook-form`. For the full form validation pattern including field-level backend errors, load the **form-validation-pattern** skill.

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  entityControllerCreate,
  getEntityControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

const createEntitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export type CreateEntityData = z.infer<typeof createEntitySchema>;

export function useCreateEntity() {
  const { t } = useTranslation('entities');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<CreateEntityData>({
    resolver: zodResolver(createEntitySchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateEntityData) => {
      return await entityControllerCreate(data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: getEntityControllerFindAllQueryKey(),
      });
      void router.invalidate();
      showSuccess(t('create.success'));
      if (data.id) {
        void router.navigate({ to: '/entities/$id', params: { id: data.id } });
      }
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'DUPLICATE_ENTITY_NAME':
            showError(t('create.duplicateName'));
            break;
          default:
            showError(t('create.error'));
        }
      } catch {
        showError(t('create.error'));
      }
    },
  });

  const onSubmit = (data: CreateEntityData) => {
    mutation.mutate(data);
  };

  const resetForm = () => {
    form.reset();
  };

  return {
    form,
    onSubmit,
    resetForm,
    isLoading: mutation.isPending,
  };
}
```

## Pattern 3: Query Hook

For data fetching. Query hooks are simpler — error handling happens at render time via the `error` return value.

```typescript
import {
  useEntityControllerFindAll,
  getEntityControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useEntities() {
  const { data, isLoading, error, refetch } = useEntityControllerFindAll(
    {},
    {
      query: {
        queryKey: getEntityControllerFindAllQueryKey({}),
      },
    },
  );

  return {
    entities: data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
}
```

## Rules

### 1. Every `onError` MUST use `extractErrorData` and check error codes

This is the most common mistake. Never show a generic error without checking the code first:

```typescript
// WRONG ✗ — ignores the error code
onError: (error) => {
  try {
    extractErrorData(error);     // ← result thrown away!
    showError(t('create.error'));
  } catch {
    showError(t('create.error'));
  }
}

// WRONG ✗ — no error inspection at all
onError: () => {
  showError(t('update.error'));
}

// CORRECT ✓ — extracts and switches on code
onError: (error) => {
  try {
    const { code } = extractErrorData(error);
    switch (code) {
      case 'ENTITY_NOT_FOUND':
        showError(t('update.notFound'));
        break;
      case 'DUPLICATE_ENTITY_NAME':
        showError(t('update.duplicateName'));
        break;
      default:
        showError(t('update.error'));
    }
  } catch {
    showError(t('update.error'));
  }
}
```

### 2. The try/catch in `onError` is structural, not optional

`extractErrorData` throws for non-Axios errors (network failures, cancellations). The catch block must always show a generic fallback error.

### 3. Map backend error codes to specific user messages

Check the module's `*.errors.ts` file in the backend for the error codes the endpoint can return. Each relevant code should have a corresponding i18n key and toast message.

### 4. Cache invalidation after mutations

Always invalidate relevant query keys after successful mutations:

```typescript
onSuccess: () => {
  void queryClient.invalidateQueries({
    queryKey: getEntityControllerFindAllQueryKey(),
  });
  void router.invalidate();
  showSuccess(t('action.success'));
},
```

Use `void` for fire-and-forget invalidation. Invalidate both the list query and any detail queries if applicable.

### 5. Return shape conventions

**Mutation hooks without a form** return the mutation result directly via `useMutation(...)`.

**Mutation hooks with a form** return:

```typescript
return {
  form,         // react-hook-form instance
  onSubmit,     // function to pass to form.handleSubmit
  resetForm,    // resets the form to defaults
  isLoading: mutation.isPending,
};
```

**Query hooks** return domain data with loading/error state:

```typescript
return {
  entities: data?.data ?? [],
  isLoading,
  error,
  refetch,       // optional, if manual refetch is needed
};
```

## Checklist

When creating or modifying a hook, verify:

- [ ] `onError` uses `extractErrorData` and switches on `code`
- [ ] Non-Axios errors caught with fallback `showError`
- [ ] Backend error codes mapped to specific i18n messages
- [ ] `onSuccess` invalidates relevant query keys
- [ ] `void` used for fire-and-forget `invalidateQueries`/`router.invalidate()`
- [ ] User-facing strings go through `useTranslation`, not hardcoded
