import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';

import { WorkspaceContextDtoMapper } from './workspace-context-dto.mapper';

describe(WorkspaceContextDtoMapper.name, () => {
  const mapper = new WorkspaceContextDtoMapper();
  const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  it.each([true, false])(
    'maps skill context with pinning %s without a separate state lookup',
    (isPinned) => {
      const skill = new WorkspaceSkill({
        name: 'Permit Check',
        shortDescription: 'Checks permit applications',
        instructions: 'Check every permit application.',
        workspaceId,
      });
      const dto = mapper.toContextDto({
        instruction: null,
        skills: [{ skill, isActive: true, isPinned }],
        knowledgeBases: [],
        runtimeKnowledgeBases: [],
      });
      expect(dto.skills).toEqual([
        expect.objectContaining({ id: skill.id, isActive: true, isPinned }),
      ]);
    },
  );

  it('maps workspace-owned skill pages', () => {
    const skill = new WorkspaceSkill({
      id: '223e4567-e89b-12d3-a456-426614174000',
      name: 'Legal Research',
      shortDescription: 'Research legal topics',
      instructions: 'Research legal topics carefully.',
      workspaceId,
    });

    const result = mapper.toSkillListDto(
      new Paginated({
        data: [{ skill, isActive: true, isPinned: false }],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );

    expect(result.data).toEqual([
      {
        id: skill.id,
        name: skill.name,
        shortDescription: skill.shortDescription,
        instructions: skill.instructions,
        knowledgeBaseIds: [],
        workspaceId,
        isActive: true,
        isPinned: false,
      },
    ]);
  });
});
