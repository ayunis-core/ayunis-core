---
name: frontend-form-pattern
description: Frontend form patterns — form types in model/, useForm setup, and end-to-end backend validation with field-level error display. Use when adding or modifying any form (page or dialog) that submits to the API.
---

# Frontend Form Pattern

This skill covers how forms are structured in page modules and the complete validation flow from backend DTO → API response → frontend form field errors with i18n.

## Form Types

Form field interfaces live in the page module's `model/` directory — never inline in the component file.

```typescript
// model/types.ts
export interface ThingFormFields {
  name: string;
  description: string;
}
```

Multiple form types can share the same file (e.g. `CreateThingFormFields` and `UpdateThingFormFields`), or use separate files if they diverge significantly.

The component imports the type:

```typescript
// ui/ThingDetailPage.tsx
import type { ThingFormFields } from '../model/types';

const form = useForm<ThingFormFields>({
  defaultValues: { name: entity.name, description: entity.description ?? '' },
});
```

### Existing examples

- `pages/admin-settings/teams-settings/model/types.ts` — `CreateTeamFormData`, `UpdateTeamFormData`
- `pages/admin-settings/letterhead-detail/model/types.ts` — `LetterheadFormFields`
- `pages/prompts/model/createPromptSchema.ts` — Zod schema with inferred type

## Page Component Structure

Page components (`ui/`) should contain only component logic: state, hooks, form setup, event handlers, and JSX. Keep them focused:

- **Form types** → `model/types.ts`
- **Form setup** (`useForm`, `defaultValues`, `onSubmit`) stays in the component — it's component logic
- **Pure helper functions** → `lib/` (see the `ayunis-core-frontend-dev` skill)

## Validation

### Overview

```text
Backend DTO (@MaxLength, @IsNotEmpty, …)
  ↓ ValidationPipe rejects
  ↓ exceptionFactory in main.ts formats response
  ↓
{ code: "VALIDATION_ERROR", errors: [{ field, constraints }] }
  ↓
Frontend hook: extractErrorData() → setValidationErrors(form, …)
  ↓
form.setError(field, { message: t("validation.field.constraint") })
  ↓
<FormMessage /> renders inline error
```

### Backend

#### DTO (class-validator decorators)

Validation rules live on the DTO. These are the source of truth — they also feed the OpenAPI spec and generated frontend client.

```typescript
// presenters/http/dto/create-thing.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateThingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}
```

#### Global ValidationPipe (already configured in `main.ts`)

The `exceptionFactory` normalizes validation errors into a structured response with a `VALIDATION_ERROR` code and field-level detail. **You don't need to touch this** — it applies globally to all DTOs.

Response format:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "description", "constraints": ["maxLength"] }
  ]
}
```

Nested DTOs produce dot-notation field names (e.g. `"address.street"`).

#### Domain errors (ApplicationError)

Domain-level errors (e.g. duplicate name, not found) are separate from DTO validation. They use the `ApplicationError` pattern with module-specific error codes:

```typescript
// application/thing.errors.ts
export class DuplicateThingNameError extends ThingError {
  constructor(name: string) {
    super(`Thing "${name}" already exists`, ThingErrorCode.DUPLICATE_NAME, 409);
  }
}
```

These flow through `ApplicationErrorFilter` and arrive at the frontend with their own `code`.

### Frontend

#### `extractErrorData` (shared, already exists)

Extracts `code`, `message`, `status`, and `errors` from Axios errors:

```typescript
import extractErrorData from '@/shared/api/extract-error-data';
// Returns: { code, message, status, errors?: FieldError[] }
```

#### `setValidationErrors` (shared helper)

Maps backend field errors to `form.setError()` with translated messages.

```typescript
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
```

Translation key resolution order:

1. `${prefix}.${field}.${constraint}` — e.g. `validation.description.maxLength`
2. `${prefix}.${field}.invalid` — e.g. `validation.description.invalid`
3. `${prefix}.invalid` — generic fallback

#### Hook pattern

The hook receives the `form` instance so it can set field errors on validation failure. Other error codes (domain errors) show toast messages as before.

```typescript
// api/useCreateThing.ts
import type { UseFormReturn } from 'react-hook-form';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';

export function useCreateThing(
  form: UseFormReturn<ThingFormData>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('things');
  const mutation = useThingsControllerCreate({
    mutation: {
      onSuccess: async () => {
        showSuccess(t('toast.createSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'validation');
          } else if (code === 'DUPLICATE_NAME') {
            showError(t('toast.duplicateName'));
          } else {
            showError(t('toast.createError'));
          }
        } catch {
          showError(t('toast.createError'));
        }
      },
    },
  });

  return {
    createThing: (data: CreateThingDto) => mutation.mutate({ data }),
    isCreating: mutation.isPending,
  };
}
```

If a hook is used **without a form** (e.g. a toggle), make `form` optional and guard the `setValidationErrors` call:

```typescript
export function useUpdateThing(
  form?: UseFormReturn<ThingFormData>,
  onSuccess?: () => void,
) {
  // ...
  if (code === 'VALIDATION_ERROR' && errors && form) {
    setValidationErrors(form, errors, t, 'validation');
  }
}
```

#### Dialog component

Pass the `form` to the hook:

```typescript
const form = useForm<ThingFormData>({ defaultValues: { name: '', description: '' } });
const { createThing, isCreating } = useCreateThing(form, () => {
  onOpenChange(false);
  form.reset();
});
```

The form fields must use `<FormMessage />` (from shadcn) to render errors inline — this is already standard in all form dialogs.

#### Translation keys

Add a `validation` section to the page's translation namespace:

```json
{
  "validation": {
    "name": {
      "isNotEmpty": "Name is required",
      "maxLength": "Name must be 100 characters or fewer",
      "invalid": "Invalid name"
    },
    "description": {
      "isNotEmpty": "Description is required",
      "maxLength": "Description must be 500 characters or fewer",
      "invalid": "Invalid description"
    },
    "invalid": "Invalid input"
  }
}
```

Constraint keys match the class-validator decorator names in camelCase: `isNotEmpty`, `maxLength`, `isString`, `isEnum`, `isEmail`, `minLength`, `length`, `matches`, etc.

## Checklist

- [ ] Form types defined in `model/types.ts`, not inline in the component
- [ ] DTO has class-validator decorators for all constraints
- [ ] Hook accepts `form` parameter and calls `setValidationErrors` on `VALIDATION_ERROR`
- [ ] Hook still handles domain error codes (e.g. duplicate) via toast
- [ ] Dialog passes `form` to the hook
- [ ] Translation file has `validation.{field}.{constraint}` keys in all locales (en, de)
- [ ] Form fields use `<FormMessage />` for inline error display

## Reference implementation

See the skill templates feature for a complete example:

- Backend DTO: `ayunis-core-backend/src/domain/skill-templates/presenters/http/dto/create-skill-template.dto.ts`
- Frontend hook: `ayunis-core-frontend/src/pages/super-admin-settings/skill-templates/api/useCreateSkillTemplate.ts`
- Frontend dialog: `ayunis-core-frontend/src/pages/super-admin-settings/skill-templates/ui/CreateSkillTemplateDialog.tsx`
- Translations: `ayunis-core-frontend/src/shared/locales/en/super-admin-settings-skills.json`
- Shared helper: `ayunis-core-frontend/src/shared/lib/set-validation-errors.ts`
- Error extractor: `ayunis-core-frontend/src/shared/api/extract-error-data.ts`
- ValidationPipe config: `ayunis-core-backend/src/main.ts` (`exceptionFactory`)
