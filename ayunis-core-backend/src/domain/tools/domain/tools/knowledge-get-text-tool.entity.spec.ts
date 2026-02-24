import { KnowledgeGetTextTool } from './knowledge-get-text-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { randomUUID } from 'crypto';

describe('KnowledgeGetTextTool', () => {
  const knowledgeBases: KnowledgeBaseSummary[] = [
    { id: randomUUID(), name: 'Legal Documents' },
    { id: randomUUID(), name: 'HR Policies' },
  ];

  it('should create tool with correct type and name', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);

    expect(tool.type).toBe(ToolType.KNOWLEDGE_GET_TEXT);
    expect(tool.name).toBe('knowledge_get_text');
  });

  it('should generate parameter schema with knowledge base IDs as enum', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);
    const schema = tool.parameters as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown>;
    const kbIdProp = properties.knowledgeBaseId as Record<string, unknown>;

    expect(kbIdProp.enum).toEqual(knowledgeBases.map((kb) => kb.id));
  });

  it('should require knowledgeBaseId and documentId parameters', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);
    const schema = tool.parameters as Record<string, unknown>;

    expect(schema.required).toEqual(['knowledgeBaseId', 'documentId']);
  });

  it('should validate valid parameters with all fields', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);
    const documentId = randomUUID();
    const result = tool.validateParams({
      knowledgeBaseId: knowledgeBases[0].id,
      documentId,
      startLine: 10,
      numLines: 50,
    });

    expect(result.knowledgeBaseId).toBe(knowledgeBases[0].id);
    expect(result.documentId).toBe(documentId);
    expect(result.startLine).toBe(10);
    expect(result.numLines).toBe(50);
  });

  it('should validate parameters without optional startLine and numLines', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);
    const documentId = randomUUID();
    const result = tool.validateParams({
      knowledgeBaseId: knowledgeBases[0].id,
      documentId,
    });

    expect(result.knowledgeBaseId).toBe(knowledgeBases[0].id);
    expect(result.documentId).toBe(documentId);
  });

  it('should reject numLines exceeding maximum of 100', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);

    expect(() =>
      tool.validateParams({
        knowledgeBaseId: knowledgeBases[0].id,
        documentId: randomUUID(),
        numLines: 101,
      }),
    ).toThrow();
  });

  it('should reject invalid knowledgeBaseId', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);

    expect(() =>
      tool.validateParams({
        knowledgeBaseId: randomUUID(),
        documentId: randomUUID(),
      }),
    ).toThrow();
  });

  it('should return true for returnsPii', () => {
    const tool = new KnowledgeGetTextTool(knowledgeBases);

    expect(tool.returnsPii).toBe(true);
  });
});
