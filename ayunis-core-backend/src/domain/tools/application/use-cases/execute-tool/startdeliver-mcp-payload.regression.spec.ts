import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { randomUUID } from 'crypto';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { McpIntegrationTool } from '../../../domain/tools/mcp-integration-tool.entity';
import { McpIntegrationToolHandler } from '../../handlers/mcp-integration-tool.handler';
import type { ExecuteMcpToolUseCase } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import type { ExecuteMcpToolCommand } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.command';
import { ExecuteToolUseCase } from './execute-tool.use-case';
import { ExecuteToolCommand } from './execute-tool.command';
import type { ToolHandlerRegistry } from '../../tool-handler.registry';
import type { ToolExecutionContext } from '../../ports/execution.handler';

// Regression for the Startdeliver ticket (AYC-413): a plain customer name
// search must not carry the optional date filters (customfieldChurnDate,
// customfieldContractStartDate, customfieldGoLiveDatum) in the outgoing MCP
// payload. This chains the real pipeline pieces: the schema the provider
// advertises to the model, the execution-time null strip, ajv validation
// against the original MCP schema, and the exact parameters handed to the
// MCP client layer.
const STARTDELIVER_FILTER_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Customer name to search for' },
    customfieldChurnDate: { type: 'string', format: 'date' },
    customfieldContractStartDate: { type: 'string', format: 'date' },
    customfieldGoLiveDatum: { type: 'string', format: 'date' },
  },
};

function buildStartdeliverTool(): McpIntegrationTool {
  return new McpIntegrationTool(
    new McpTool(
      'search_customers',
      'Search Startdeliver customers',
      STARTDELIVER_FILTER_SCHEMA,
      randomUUID(),
    ),
    false,
    'Startdeliver',
    null,
  );
}

// The request-side half — the strict-mode schema advertising a null escape
// hatch for each optional date filter so the model never fabricates dates —
// is locked in by provider-openai's normalize-schema.spec.ts with this same
// field set.
describe('Startdeliver MCP payload regression (AYC-413)', () => {
  it('sends only the name filter to the MCP layer when the model declines the date fields', async () => {
    const tool = buildStartdeliverTool();
    let outgoing: ExecuteMcpToolCommand | undefined;
    const executeMcpTool = {
      execute: (command: ExecuteMcpToolCommand) => {
        outgoing = command;
        return Promise.resolve({ isError: false, content: [] });
      },
    } as unknown as ExecuteMcpToolUseCase;
    const handler = new McpIntegrationToolHandler(
      createPinoLoggerMock(),
      executeMcpTool,
    );
    const registry = {
      getHandler: () => handler,
    } as unknown as ToolHandlerRegistry;
    const useCase = new ExecuteToolUseCase(createPinoLoggerMock(), registry);

    // What a strict-mode model (or an imitating Claude/Opus turn) emits for
    // the search "Stadt Ladenburg": nulls for every optional date filter.
    await useCase.execute(
      new ExecuteToolCommand(
        tool,
        {
          name: 'Stadt Ladenburg',
          customfieldChurnDate: null,
          customfieldContractStartDate: null,
          customfieldGoLiveDatum: null,
        },
        {} as ToolExecutionContext,
      ),
    );

    expect(outgoing?.parameters).toEqual({ name: 'Stadt Ladenburg' });
    expect(outgoing?.toolName).toBe('search_customers');
  });
});
