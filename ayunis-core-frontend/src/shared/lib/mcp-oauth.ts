export interface McpOAuthConfig {
  clientRegistration: 'automatic' | 'static';
  scopes?: string[];
}

export interface McpOAuthClientInput {
  clientId: string;
  clientSecret?: string;
}

export interface McpSchemaWithOAuth {
  authType?: string;
  oauth?: McpOAuthConfig;
}

export function parseOAuthScopes(value: string): string[] | undefined {
  const scopes = [
    ...new Set(value.split(/[\s,]+/).map((scope) => scope.trim())),
  ].filter(Boolean);
  return scopes.length > 0 ? scopes : undefined;
}

export function hasOAuthConfiguration(
  schema: McpSchemaWithOAuth | null | undefined,
): schema is McpSchemaWithOAuth & { oauth: McpOAuthConfig } {
  return schema?.authType === 'OAUTH' && schema.oauth !== undefined;
}

export function getOAuthCallbackUri(origin = window.location.origin): string {
  return new URL('/settings/integrations/oauth/callback', origin).toString();
}
