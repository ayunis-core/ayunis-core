import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { getToolActionLabel } from './get-tool-action-label';

const t = ((key: string) => key) as unknown as TFunction;

function toolUse(
  name: string,
  params: Record<string, unknown>,
): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'call-1',
    name,
    params,
  };
}

describe('getToolActionLabel', () => {
  it('shows every query of a batched source search', () => {
    const label = getToolActionLabel(
      toolUse('source_query', {
        sourceIds: ['a1b2c3d4-0000-4000-8000-000000000001'],
        queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
      }),
      t,
    );

    expect(label.target).toBe('Kündigungsfrist, Vertragslaufzeit');
  });

  it('shows every query of a batched knowledge base search', () => {
    const label = getToolActionLabel(
      toolUse('knowledge_query', {
        knowledgeBaseIds: ['a1b2c3d4-0000-4000-8000-000000000002'],
        queries: ['Urlaubsanspruch', 'Sonderurlaub'],
      }),
      t,
    );

    expect(label.target).toBe('Urlaubsanspruch, Sonderurlaub');
  });

  it('still shows the query of a historical single-query search', () => {
    const label = getToolActionLabel(
      toolUse('source_query', {
        sourceId: 'a1b2c3d4-0000-4000-8000-000000000001',
        query: 'Kündigungsfrist',
      }),
      t,
    );

    expect(label.target).toBe('Kündigungsfrist');
  });
});
