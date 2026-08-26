import type { ProviderRequest, ToolSchema } from '@ayunis/inference';
import { createHash } from 'crypto';
import type { ToolUseIntegration } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';

interface ToolIntegrationLookup {
  get(toolName: string): ToolUseIntegration | undefined;
}

interface ProviderToolDiagnostic {
  readonly name: string;
  readonly schemaHash: string;
  readonly mcpIntegrationId?: string;
  readonly mcpIntegrationName?: string;
}

interface ProviderRequestDiagnostics {
  readonly toolSchemaBytes: number;
  readonly toolSetHash: string;
  readonly tools: ProviderToolDiagnostic[];
}

export function buildProviderRequestDiagnostics(
  request: ProviderRequest,
  integrations?: ToolIntegrationLookup,
): ProviderRequestDiagnostics {
  const serializedTools = JSON.stringify(request.tools);
  return {
    toolSchemaBytes: Buffer.byteLength(serializedTools),
    toolSetHash: hash(serializedTools),
    tools: request.tools.map((tool) =>
      buildToolDiagnostic(tool, integrations?.get(tool.name)),
    ),
  };
}

function buildToolDiagnostic(
  tool: ToolSchema,
  integration: ToolUseIntegration | undefined,
): ProviderToolDiagnostic {
  return {
    name: tool.name,
    schemaHash: hash(JSON.stringify(tool)),
    ...(integration
      ? {
          mcpIntegrationId: integration.id,
          mcpIntegrationName: integration.name,
        }
      : {}),
  };
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
