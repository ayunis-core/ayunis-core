import { ToolLoadingPolicyService } from './tool-loading-policy.service';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { KnowledgeQueryTool } from 'src/domain/tools/domain/tools/knowledge-query-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { BarChartTool } from 'src/domain/tools/domain/tools/bar-chart-tool.entity';
import type { UUID } from 'crypto';

const knowledgeBases = [
  {
    id: '0c87c3c5-0f0a-4df0-bd2e-20d61f56e416' as UUID,
    name: 'Municipal fee regulations',
  },
];

describe('ToolLoadingPolicyService', () => {
  const service = new ToolLoadingPolicyService();

  it('loads contextual tools and defers infrequent tools', () => {
    const internetSearch = new InternetSearchTool();
    const knowledgeQuery = new KnowledgeQueryTool(knowledgeBases);
    const createDocument = new CreateDocumentTool();

    const result = service.select(
      [internetSearch, knowledgeQuery, createDocument],
      new Set(),
    );

    expect(result.loadedTools.map((tool) => tool.name)).toEqual([
      'internet_search',
      'knowledge_query',
    ]);
    expect(result.deferredTools.map((tool) => tool.name)).toEqual([
      'create_document',
    ]);
  });

  it('loads explicitly activated tools', () => {
    const createDocument = new CreateDocumentTool();

    const result = service.select(
      [new InternetSearchTool(), createDocument],
      new Set(['create_document']),
    );

    expect(result.loadedTools).toContain(createDocument);
    expect(result.deferredTools).not.toContain(createDocument);
  });

  it('keeps contextual defaults when activated tools exceed remaining capacity', () => {
    const knowledgeQuery = new KnowledgeQueryTool(knowledgeBases);
    const activatedTools = Array.from({ length: 14 }, (_, index) => {
      const tool = new BarChartTool();
      tool.name = `activated_${index}`;
      return tool;
    });

    const result = service.select(
      [knowledgeQuery, ...activatedTools],
      new Set(activatedTools.map((tool) => tool.name)),
    );

    expect(result.loadedTools).toContain(knowledgeQuery);
    expect(result.loadedTools).toHaveLength(14);
  });

  it('reserves one provider slot for deferred-tool discovery', () => {
    const tools = Array.from({ length: 20 }, (_, index) => {
      const tool = new BarChartTool();
      tool.name = `chart_${index}`;
      return tool;
    });

    const result = service.select(
      tools,
      new Set(tools.map((tool) => tool.name)),
    );

    expect(result.loadedTools).toHaveLength(14);
    expect(result.deferredTools).toHaveLength(6);
  });
});
