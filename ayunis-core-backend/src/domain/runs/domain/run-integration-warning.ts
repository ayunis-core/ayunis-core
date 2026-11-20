export interface IntegrationWarning {
  integrationId: string;
  integrationName: string;
}

export class RunIntegrationWarning {
  constructor(public readonly integration: IntegrationWarning) {}
}

export const MCP_INTEGRATION_WARNING_EVENT = 'mcp_integration_unavailable';

export function integrationWarningItems(
  warnings?: readonly IntegrationWarning[],
): RunIntegrationWarning[] {
  return (warnings ?? []).map((warning) => new RunIntegrationWarning(warning));
}
