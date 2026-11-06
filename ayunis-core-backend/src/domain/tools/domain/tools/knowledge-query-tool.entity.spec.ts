import { KnowledgeQueryTool } from './knowledge-query-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { randomUUID } from 'crypto';

describe('KnowledgeQueryTool', () => {
  const knowledgeBases: KnowledgeBaseSummary[] = [
    { id: randomUUID(), name: 'Legal Documents' },
    { id: randomUUID(), name: 'HR Policies' },
  ];

  it('should create tool with correct type and name', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(tool.type).toBe(ToolType.KNOWLEDGE_QUERY);
    expect(tool.name).toBe('knowledge_query');
  });

  it('should generate parameter schema with knowledge base IDs as item enum', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);
    const schema = tool.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const kbIdsProp = properties.knowledgeBaseIds as Record<string, unknown>;
    const items = kbIdsProp.items as Record<string, unknown>;

    expect(items.enum).toEqual(knowledgeBases.map((kb) => kb.id));
  });

  it('should require knowledgeBaseIds and queries parameters', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);
    const schema = tool.parameters as Record<string, unknown>;

    expect(schema.required).toEqual(['knowledgeBaseIds', 'queries']);
  });

  it('should accept several knowledge bases and several queries in one call', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);
    const result = tool.validateParams({
      knowledgeBaseIds: knowledgeBases.map((kb) => kb.id),
      queries: ['Urlaubsanspruch', 'Sonderurlaub'],
    });

    expect(result.knowledgeBaseIds).toEqual(knowledgeBases.map((kb) => kb.id));
    expect(result.queries).toEqual(['Urlaubsanspruch', 'Sonderurlaub']);
  });

  it('should reject the single knowledgeBaseId and query shape', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(() =>
      tool.validateParams({
        knowledgeBaseId: knowledgeBases[0].id,
        query: 'Urlaubsanspruch',
      }),
    ).toThrow(/missing required parameter 'knowledgeBaseIds'/);
  });

  it('should reject a knowledge base that is not available', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(() =>
      tool.validateParams({
        knowledgeBaseIds: [knowledgeBases[0].id, randomUUID()],
        queries: ['Urlaubsanspruch'],
      }),
    ).toThrow(/parameter 'knowledgeBaseIds.1' must be one of/);
  });

  it('should reject more than five queries', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(() =>
      tool.validateParams({
        knowledgeBaseIds: [knowledgeBases[0].id],
        queries: [
          'Urlaub',
          'Krankheit',
          'Elternzeit',
          'Gehalt',
          'Fahrt',
          'Ort',
        ],
      }),
    ).toThrow(/'queries' must NOT have more than 5 items/);
  });

  it('should describe the array inputs to the model', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(tool.description).toMatch(/several knowledge bases/);
    expect(tool.descriptionLong).toMatch(/matchedQueries/);
  });

  it('should return true for returnsPii', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(tool.returnsPii).toBe(true);
  });

  it('should handle empty knowledge bases array', () => {
    const tool = new KnowledgeQueryTool([]);
    const schema = tool.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const kbIdsProp = properties.knowledgeBaseIds as Record<string, unknown>;
    const items = kbIdsProp.items as Record<string, unknown>;

    expect(items.enum).toEqual([]);
  });
});
