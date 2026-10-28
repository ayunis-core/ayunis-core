import { describe, expect, it } from 'vitest';

import { formatToolName } from './format-tool-name';

const INTEGRATION_PREFIX = 'b0eb63cb';

describe('formatToolName', () => {
  it('hides the MCP namespace and integration prefix from tool labels', () => {
    expect(
      formatToolName(`mcp__tool__create_document__${INTEGRATION_PREFIX}`),
    ).toBe('Create Document');
  });

  it('hides the MCP namespace and integration prefix from resource labels', () => {
    expect(
      formatToolName(`mcp__resource__municipal_records__${INTEGRATION_PREFIX}`),
    ).toBe('Municipal Records');
  });

  it('still strips the legacy server prefix', () => {
    expect(formatToolName('mcp_obsidian-mcp-tools_fetch')).toBe('Fetch');
  });
});
