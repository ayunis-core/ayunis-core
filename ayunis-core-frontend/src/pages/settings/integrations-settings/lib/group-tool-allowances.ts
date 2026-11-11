import type { McpToolAllowanceResponseDto } from '@/shared/api';

export interface ToolAllowanceGroup {
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string | null;
  allowances: McpToolAllowanceResponseDto[];
}

export function groupToolAllowancesByIntegration(
  allowances: McpToolAllowanceResponseDto[],
): ToolAllowanceGroup[] {
  const groups = new Map<string, ToolAllowanceGroup>();
  for (const allowance of allowances) {
    const group = groups.get(allowance.integrationId) ?? {
      integrationId: allowance.integrationId,
      integrationName: allowance.integrationName,
      integrationLogoUrl: allowance.integrationLogoUrl,
      allowances: [],
    };
    group.allowances.push(allowance);
    groups.set(allowance.integrationId, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.integrationName.localeCompare(b.integrationName))
    .map((group) => ({
      ...group,
      allowances: [...group.allowances].sort((a, b) =>
        a.toolName.localeCompare(b.toolName),
      ),
    }));
}
