import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Frontend mirror of the backend `ConfigField` semantics
 * (see `integration-config-schema.ts`). Keep these in sync so the form and the
 * settings list agree with backend authorization and validation rules.
 */

/**
 * Whether the field's value is fixed by the marketplace (system-controlled).
 * Such fields are never user-editable and must not appear in config forms.
 */
export function isSystemFixedField(
  field: MarketplaceIntegrationConfigFieldDto,
): boolean {
  return typeof field.value === 'string' && field.value.length > 0;
}

/**
 * Whether the user can edit this field (i.e. it is not system-fixed). Drives
 * which fields are rendered in the config form.
 */
export function isUserEditableField(
  field: MarketplaceIntegrationConfigFieldDto,
): boolean {
  return !isSystemFixedField(field);
}
