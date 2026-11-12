import { describe, expect, it } from 'vitest';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import { buildUpdatePayload } from './build-update-integration-payload';

const marketplace = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'OpenProject',
  type: 'marketplace',
  serverUrl: 'https://projekte.stadt.de/mcp',
  customerProvidesServerUrl: true,
  serverUrlHint: 'Your OpenProject MCP address',
  configSchema: { authType: 'NO_AUTH', orgFields: [], userFields: [] },
  orgConfigValues: {},
} as unknown as McpIntegration;

function payloadFor(
  integration: McpIntegration,
  data: Parameters<typeof buildUpdatePayload>[0]['data'],
) {
  return buildUpdatePayload({
    data,
    integration,
    isSchemaConfigured: true,
    editableFields: [],
    configFormValues: {},
    currentOrgValues: {},
    hasStaticOAuthClient: false,
  });
}

describe('buildUpdatePayload server URL', () => {
  it('sends a changed, trimmed server URL', () => {
    expect(
      payloadFor(marketplace, {
        name: 'OpenProject',
        serverUrl: ' https://neu.stadt.de/mcp ',
      }),
    ).toEqual({ serverUrl: 'https://neu.stadt.de/mcp' });
  });

  it('omits an unchanged server URL', () => {
    expect(
      payloadFor(marketplace, {
        name: 'OpenProject',
        serverUrl: 'https://projekte.stadt.de/mcp',
      }),
    ).toEqual({});
  });

  it('never sends a server URL fixed by the marketplace', () => {
    expect(
      payloadFor(
        {
          ...marketplace,
          serverUrl: undefined,
          customerProvidesServerUrl: false,
        },
        { name: 'OpenProject', serverUrl: 'https://neu.stadt.de/mcp' },
      ),
    ).toEqual({});
  });
});

describe('buildUpdatePayload instructions', () => {
  const withInstructions = {
    ...marketplace,
    instructions: 'Search by surname first.',
  } as McpIntegration;

  it('omits unchanged instructions so a rename cannot overwrite them', () => {
    expect(
      payloadFor(withInstructions, {
        name: 'Projects',
        serverUrl: 'https://projekte.stadt.de/mcp',
        instructions: 'Search by surname first.',
      }),
    ).toEqual({ name: 'Projects' });
  });

  it('sends changed instructions trimmed', () => {
    expect(
      payloadFor(withInstructions, {
        name: 'OpenProject',
        serverUrl: 'https://projekte.stadt.de/mcp',
        instructions: '  Always cite the work package number. ',
      }),
    ).toEqual({ instructions: 'Always cite the work package number.' });
  });

  it('sends null when the admin empties the field, so the stored text is removed', () => {
    expect(
      payloadFor(withInstructions, {
        name: 'OpenProject',
        serverUrl: 'https://projekte.stadt.de/mcp',
        instructions: '   ',
      }),
    ).toEqual({ instructions: null });
  });

  it('sends instructions for an integration without a config schema', () => {
    expect(
      buildUpdatePayload({
        data: { name: 'Notion', instructions: 'Search before creating pages.' },
        integration: {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Notion',
          type: 'predefined',
          authMethod: 'NO_AUTH',
        } as unknown as McpIntegration,
        isSchemaConfigured: false,
        editableFields: [],
        configFormValues: {},
        currentOrgValues: {},
        hasStaticOAuthClient: false,
      }),
    ).toEqual({ instructions: 'Search before creating pages.' });
  });
});
