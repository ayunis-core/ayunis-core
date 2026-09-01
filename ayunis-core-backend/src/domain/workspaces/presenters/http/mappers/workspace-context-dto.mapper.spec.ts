import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspaceContextDtoMapper } from './workspace-context-dto.mapper';

describe(WorkspaceContextDtoMapper.name, () => {
  const mapper = new WorkspaceContextDtoMapper();
  const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  it('maps workspace-owned skill pages', () => {
    const skill = new Skill({
      id: '223e4567-e89b-12d3-a456-426614174000',
      name: 'Legal Research',
      shortDescription: 'Research legal topics',
      instructions: 'Research legal topics carefully.',
      workspaceId,
    });

    const result = mapper.toSkillListDto(
      new Paginated({ data: [skill], limit: 20, offset: 0, total: 1 }),
    );

    expect(result.data).toEqual([
      {
        id: skill.id,
        name: skill.name,
        shortDescription: skill.shortDescription,
      },
    ]);
  });

  it('maps workspace-owned knowledge-base pages', () => {
    const knowledgeBase = new KnowledgeBase({
      id: '323e4567-e89b-12d3-a456-426614174000',
      name: 'Council Documents',
      description: 'Municipal council documents',
      orgId: '423e4567-e89b-12d3-a456-426614174000',
      workspaceId,
    });

    const result = mapper.toKnowledgeBaseListDto(
      new Paginated({
        data: [{ ...knowledgeBase, documentCount: 12 }],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );

    expect(result.data).toEqual([
      {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        documentCount: 12,
      },
    ]);
  });
});
