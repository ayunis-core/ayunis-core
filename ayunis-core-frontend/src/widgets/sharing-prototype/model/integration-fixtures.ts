import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

function integration(
  id: string,
  name: string,
  extra: Partial<McpIntegrationResponseDto> = {},
): McpIntegrationResponseDto {
  return {
    id,
    name,
    type: 'marketplace',
    enabled: true,
    organizationId: 'prototype-org',
    hasCredentials: true,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    returnsPii: false,
    ...extra,
  };
}

export const PROTOTYPE_INTEGRATIONS: McpIntegrationResponseDto[] = [
  integration('bundesgesetze', 'Bundesgesetze'),
  integration('speechmind', 'SpeechMind', {
    userAuthorizationRequired: true,
    userAuthorized: false,
  }),
];
