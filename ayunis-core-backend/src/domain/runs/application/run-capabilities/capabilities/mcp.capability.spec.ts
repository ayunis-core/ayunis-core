import type { UUID } from 'crypto';
import { McpToolAssemblerService } from 'src/domain/runs/application/services/mcp-tool-assembler.service';
import {
  aCapabilityContext,
  aThread,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { McpCapability } from './mcp.capability';

const integrationId = '88888888-8888-4888-8888-888888888888' as UUID;

function buildCapability(toolDescriptions: string[]) {
  const discover = jest.fn().mockResolvedValue({
    tools: toolDescriptions.map((description) => ({
      name: 'notion.search',
      description,
      inputSchema: { type: 'object', properties: {} },
      integrationId,
    })),
    resources: [],
    prompts: [],
    returnsPii: false,
  });
  const capability = new McpCapability(
    new McpToolAssemblerService(
      { execute: discover } as never,
      {
        execute: jest
          .fn()
          .mockResolvedValue([{ id: integrationId, name: 'Notion' }]),
      } as never,
    ),
  );
  return { capability, discover };
}

const context = (canUseTools = true) =>
  aCapabilityContext({
    canUseTools,
    thread: aThread({ mcpIntegrationIds: [integrationId] }),
  });
const mcpName = `mcp__tool__notion.search__${integrationId.slice(0, 8)}`;

describe('McpCapability', () => {
  it("offers the thread's MCP integration tools", async () => {
    const { capability } = buildCapability(['Search Notion']);

    expect(
      toolNames(
        await capability.contribute(context(), {
          reservedToolNames: new Set(),
        }),
      ),
    ).toEqual([mcpName]);
  });

  it('drops MCP tools whose names are already taken', async () => {
    const { capability } = buildCapability(['Search Notion']);

    const contribution = await capability.contribute(context(), {
      reservedToolNames: new Set([mcpName]),
    });

    expect(contribution.tools).toEqual([]);
  });

  it('keeps only the first MCP tool when two share a name', async () => {
    const { capability } = buildCapability(['first', 'second']);

    const { tools } = await capability.contribute(context(), {
      reservedToolNames: new Set(),
    });

    expect(tools?.map((tool) => tool.description)).toEqual([
      expect.stringContaining('first'),
    ]);
  });

  it('skips MCP discovery when the model cannot use tools', async () => {
    const { capability, discover } = buildCapability(['Search Notion']);

    expect(
      await capability.contribute(context(false), {
        reservedToolNames: new Set(),
      }),
    ).toEqual({});
    expect(discover).not.toHaveBeenCalled();
  });
});
