import { KnowledgeQueryTool } from './knowledge-query-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
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

  it('should generate parameter schema with knowledge base IDs as enum', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);
    const schema = tool.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const kbIdProp = properties.knowledgeBaseId as Record<string, unknown>;

    expect(kbIdProp.enum).toEqual(knowledgeBases.map((kb) => kb.id));
  });

  it('should require knowledgeBaseId and query parameters', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);
    const schema = tool.parameters as Record<string, unknown>;

    expect(schema.required).toEqual(['knowledgeBaseId', 'query']);
  });

  it('should validate valid parameters', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);
    const result = tool.validateParams({
      knowledgeBaseId: knowledgeBases[0].id,
      query: 'What are the vacation policies?',
    });

    expect(result.knowledgeBaseId).toBe(knowledgeBases[0].id);
    expect(result.query).toBe('What are the vacation policies?');
  });

  it('should reject invalid knowledgeBaseId', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(() =>
      tool.validateParams({
        knowledgeBaseId: randomUUID(),
        query: 'test',
      }),
    ).toThrow();
  });

  it('should return true for returnsPii', () => {
    const tool = new KnowledgeQueryTool(knowledgeBases);

    expect(tool.returnsPii).toBe(true);
  });

  it('should handle empty knowledge bases array', () => {
    const tool = new KnowledgeQueryTool([]);
    const schema = tool.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const kbIdProp = properties.knowledgeBaseId as Record<string, unknown>;

    expect(kbIdProp.enum).toEqual([]);
  });
});
