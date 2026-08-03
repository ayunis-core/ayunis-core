import type {
  CreateCustomIntegrationFormData,
  CustomConfigFieldFormData,
} from '../model/types';
import type { CreateCustomIntegrationDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function buildCustomIntegrationPayload(
  data: CreateCustomIntegrationFormData,
): CreateCustomIntegrationDto {
  const orgFields = data.fields
    .filter((field) => field.scope === 'organization')
    .map(toConfigField);
  const userFields = data.fields
    .filter((field) => field.scope === 'user')
    .map(toConfigField);
  const orgConfigValues = Object.fromEntries(
    data.fields
      .filter((field) => field.scope === 'organization')
      .map((field) => [field.key, field.value]),
  );

  return {
    name: data.name.trim(),
    serverUrl: data.serverUrl.trim(),
    configSchema: { orgFields, userFields },
    orgConfigValues,
  };
}

function toConfigField(field: CustomConfigFieldFormData) {
  return {
    key: field.key,
    label: field.label.trim(),
    type: field.type,
    headerName: field.headerName.trim(),
    required: field.required,
    ...(field.prefix.trim() ? { prefix: field.prefix } : {}),
    ...(field.help.trim() ? { help: field.help.trim() } : {}),
  };
}
