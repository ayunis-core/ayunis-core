import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { LoadToolsTool } from 'src/domain/tools/domain/tools/load-tools-tool.entity';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';

describe('LoadToolsTool', () => {
  const deferredTools = [new InternetSearchTool(), new CreateDocumentTool()];

  it('advertises deferred tool names without their parameter schemas', () => {
    const tool = new LoadToolsTool(deferredTools);
    const schema = tool.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const toolNames = properties.toolNames as {
      items: { enum: string[] };
      maxItems: number;
    };

    expect(tool.type).toBe(ToolType.LOAD_TOOLS);
    expect(toolNames.items.enum).toEqual([
      'internet_search',
      'create_document',
    ]);
    expect(toolNames.maxItems).toBe(4);
    expect(JSON.stringify(tool.parameters)).not.toContain('artifact_id');
  });

  it('accepts available deferred tool names', () => {
    const tool = new LoadToolsTool(deferredTools);

    expect(tool.validateParams({ toolNames: ['internet_search'] })).toEqual({
      toolNames: ['internet_search'],
    });
  });

  it('rejects unavailable tool names', () => {
    const tool = new LoadToolsTool(deferredTools);

    expect(() =>
      tool.validateParams({ toolNames: ['knowledge_query'] }),
    ).toThrow();
  });
});
