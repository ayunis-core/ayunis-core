import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { WorkspaceKnowledgeBaseCandidate } from 'src/domain/workspaces/application/use-cases/list-workspace-knowledge-base-candidates/list-workspace-knowledge-base-candidates.use-case';
import type { WorkspaceSkillCandidate } from 'src/domain/workspaces/application/use-cases/list-workspace-skill-candidates/list-workspace-skill-candidates.use-case';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspaceContextDtoMapper } from './workspace-context-dto.mapper';

describe('WorkspaceContextDtoMapper', () => {
  const mapper = new WorkspaceContextDtoMapper();
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const skill = new Skill({
    id: '223e4567-e89b-12d3-a456-426614174000',
    name: 'Legal Research',
    shortDescription: 'Research legal topics',
    instructions: 'Research legal topics carefully.',
    userId,
  });
  const knowledgeBase = new KnowledgeBase({
    id: '323e4567-e89b-12d3-a456-426614174000',
    name: 'Council Documents',
    description: 'Municipal council documents',
    orgId: userId,
    userId,
  });

  it('maps a paginated skill candidate page', () => {
    const candidate: WorkspaceSkillCandidate = {
      skill,
      isAttached: true,
    };

    const result = mapper.toSkillCandidateListDto(
      new Paginated({
        data: [candidate],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );

    expect(result).toEqual({
      data: [
        {
          id: skill.id,
          name: skill.name,
          shortDescription: skill.shortDescription,
          isAttached: true,
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    });
  });

  it('maps a paginated knowledge-base candidate page', () => {
    const candidate: WorkspaceKnowledgeBaseCandidate = {
      knowledgeBase,
      documentCount: 12,
      isAttached: false,
    };

    const result = mapper.toKnowledgeBaseCandidateListDto(
      new Paginated({
        data: [candidate],
        limit: 20,
        offset: 20,
        total: 32,
      }),
    );

    expect(result).toEqual({
      data: [
        {
          id: knowledgeBase.id,
          name: knowledgeBase.name,
          description: knowledgeBase.description,
          documentCount: 12,
          isAttached: false,
        },
      ],
      pagination: { limit: 20, offset: 20, total: 32 },
    });
  });
});
