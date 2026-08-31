import { Brackets, type SelectQueryBuilder } from 'typeorm';
import type { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import {
  KnowledgeBaseShareRecord,
  SkillShareRecord,
} from 'src/domain/shares/infrastructure/postgres/schema/share.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';

export interface ActiveKnowledgeBaseAccessQueries {
  directShare: string;
  sharedSkill: string;
}

export function buildActiveKnowledgeBaseAccessQueries(
  query: SelectQueryBuilder<KnowledgeBaseRecord>,
): ActiveKnowledgeBaseAccessQueries {
  return {
    directShare: buildDirectShareAccessQuery(query),
    sharedSkill: buildSharedSkillAccessQuery(query),
  };
}

function buildDirectShareAccessQuery(
  query: SelectQueryBuilder<KnowledgeBaseRecord>,
): string {
  const subQuery = query
    .subQuery()
    .select('1')
    .from(KnowledgeBaseShareRecord, 'directShare')
    .innerJoin('directShare.scope', 'directScope')
    .leftJoin(
      TeamMemberRecord,
      'directTeamMember',
      'directTeamMember.teamId = directScope.teamId AND directTeamMember.userId = :userId',
    )
    .where(
      `directShare.knowledgeBaseId = ${outerKnowledgeBaseColumn(query, 'id')}`,
    )
    .andWhere(accessibleScope('directScope', 'directTeamMember'));
  query.setParameters(subQuery.getParameters());
  return subQuery.getQuery();
}

function buildSharedSkillAccessQuery(
  query: SelectQueryBuilder<KnowledgeBaseRecord>,
): string {
  return query
    .subQuery()
    .select('1')
    .from(SkillRecord, 'sharedSkill')
    .innerJoin('sharedSkill.knowledgeBases', 'linkedKnowledgeBase')
    .innerJoin(
      SkillShareRecord,
      'skillShare',
      'skillShare.skillId = sharedSkill.id',
    )
    .innerJoin('skillShare.scope', 'skillScope')
    .leftJoin(
      TeamMemberRecord,
      'skillTeamMember',
      'skillTeamMember.teamId = skillScope.teamId AND skillTeamMember.userId = :userId',
    )
    .where(`linkedKnowledgeBase.id = ${outerKnowledgeBaseColumn(query, 'id')}`)
    .andWhere('skillShare.entity_type = :skillEntityType')
    .andWhere(
      `sharedSkill.userId = ${outerKnowledgeBaseColumn(query, 'userId')}`,
    )
    .andWhere(accessibleScope('skillScope', 'skillTeamMember'))
    .getQuery();
}

function accessibleScope(
  scopeAlias: string,
  teamMemberAlias: string,
): Brackets {
  return new Brackets((scope) => {
    scope
      .where(
        `${scopeAlias}.scope_type = :orgScopeType AND ${scopeAlias}.orgId = :orgId`,
      )
      .orWhere(
        `${scopeAlias}.scope_type = :teamScopeType AND ${teamMemberAlias}.id IS NOT NULL`,
      );
  });
}

function outerKnowledgeBaseColumn(
  query: SelectQueryBuilder<KnowledgeBaseRecord>,
  column: 'id' | 'userId',
): string {
  return `${query.escape('knowledgeBase')}.${query.escape(column)}`;
}
