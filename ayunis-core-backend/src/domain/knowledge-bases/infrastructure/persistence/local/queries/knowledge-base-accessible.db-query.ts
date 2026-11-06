import type { UUID } from 'crypto';
import {
  Brackets,
  type Repository,
  type SelectQueryBuilder,
  type WhereExpressionBuilder,
} from 'typeorm';
import type {
  AccessibleKnowledgeBaseScope,
  KnowledgeBaseListOptions,
} from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { KnowledgeBaseActivationRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base-activation.record';
import type { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { buildKnowledgeBaseAccessSubqueries } from './knowledge-base-access.db-query';

/** Omitting `orgId` leaves org-owned rows out. */
export interface CollectiveOwnerFilter {
  orgId?: UUID;
  teamIds: UUID[];
}

/**
 * Restricts a `knowledgeBase` query to rows owned by the given teams or
 * organization. Org ownership is always tied to the organization ID, so a
 * query without its own tenant filter can never reach another organization.
 */
export function whereCollectiveKnowledgeBaseOwner(
  query: WhereExpressionBuilder,
  owners: CollectiveOwnerFilter,
): WhereExpressionBuilder {
  query.where(
    'knowledgeBase.isOrgOwned = true AND knowledgeBase.orgId = :ownerOrgId',
    { ownerOrgId: owners.orgId ?? null },
  );
  if (owners.teamIds.length > 0) {
    query.orWhere('knowledgeBase.teamId IN (:...ownerTeamIds)', {
      ownerTeamIds: owners.teamIds,
    });
  }
  return query;
}

/**
 * Non-workspace knowledge bases of the scope's organization the user may read:
 * owned or shared personal ones, and those of the user's teams and the
 * organization. The optional conditions narrow either branch (e.g. to active
 * rows) without touching the other.
 */
export function buildAccessibleKnowledgeBaseQuery(
  repository: Repository<KnowledgeBaseRecord>,
  scope: AccessibleKnowledgeBaseScope,
  options: { personalCondition?: string; collectiveCondition?: string } = {},
): SelectQueryBuilder<KnowledgeBaseRecord> {
  const query = repository.createQueryBuilder('knowledgeBase');
  const access = buildKnowledgeBaseAccessSubqueries(query);
  return query
    .where('knowledgeBase.workspaceId IS NULL')
    .andWhere('knowledgeBase.orgId = :orgId')
    .andWhere(
      new Brackets((accessQuery) => {
        accessQuery
          .where(
            new Brackets((personal) => {
              personal.where(
                new Brackets((owner) => {
                  owner
                    .where('knowledgeBase.userId = :userId')
                    .orWhere(`EXISTS ${access.directShare}`)
                    .orWhere(`EXISTS ${access.sharedSkill}`);
                }),
              );
              // Only personal knowledge bases can be shared; a share row left
              // on one that has since moved to a team must not widen access.
              personal.andWhere('knowledgeBase.userId IS NOT NULL');
              if (options.personalCondition) {
                personal.andWhere(options.personalCondition);
              }
            }),
          )
          .orWhere(
            new Brackets((collective) => {
              collective.where(
                new Brackets((owner) =>
                  whereCollectiveKnowledgeBaseOwner(owner, scope),
                ),
              );
              if (options.collectiveCondition) {
                collective.andWhere(options.collectiveCondition);
              }
            }),
          );
      }),
    )
    .setParameters({
      userId: scope.userId,
      orgId: scope.orgId,
      skillEntityType: SharedEntityType.SKILL,
      orgScopeType: ShareScopeType.ORG,
      teamScopeType: ShareScopeType.TEAM,
    });
}

/** Personal rows need the user's activation; team and org rows their own state. */
export function buildActiveKnowledgeBaseQuery(
  repository: Repository<KnowledgeBaseRecord>,
  scope: AccessibleKnowledgeBaseScope,
): SelectQueryBuilder<KnowledgeBaseRecord> {
  return buildAccessibleKnowledgeBaseQuery(repository, scope, {
    personalCondition: 'activation.id IS NOT NULL',
    collectiveCondition: 'knowledgeBase.isActive = true',
  }).leftJoin(
    KnowledgeBaseActivationRecord,
    'activation',
    'activation.knowledgeBaseId = knowledgeBase.id AND activation.userId = :userId',
  );
}

/** The list query behind `GET /knowledge-bases` (owner-scoped pages). */
export function buildListKnowledgeBasesQuery(
  repository: Repository<KnowledgeBaseRecord>,
  scope: {
    userId: UUID;
    workspaceId?: UUID;
    sharedKnowledgeBaseIds: UUID[];
    collectiveOwners?: CollectiveOwnerFilter;
  },
  options: KnowledgeBaseListOptions,
): SelectQueryBuilder<KnowledgeBaseRecord> {
  const queryBuilder = repository.createQueryBuilder('knowledgeBase');

  if (scope.workspaceId) {
    queryBuilder.where('knowledgeBase.workspaceId = :workspaceId', {
      workspaceId: scope.workspaceId,
    });
  } else {
    queryBuilder
      .where(
        new Brackets((accessQuery) => {
          accessQuery.where('knowledgeBase.userId = :userId', {
            userId: scope.userId,
          });
          if (scope.sharedKnowledgeBaseIds.length > 0) {
            accessQuery.orWhere(
              'knowledgeBase.id IN (:...sharedKnowledgeBaseIds) AND knowledgeBase.userId IS NOT NULL',
              { sharedKnowledgeBaseIds: scope.sharedKnowledgeBaseIds },
            );
          }
          const collectiveOwners = scope.collectiveOwners;
          if (collectiveOwners) {
            accessQuery.orWhere(
              new Brackets((owner) =>
                whereCollectiveKnowledgeBaseOwner(owner, collectiveOwners),
              ),
            );
          }
        }),
      )
      .andWhere('knowledgeBase.workspaceId IS NULL');
  }

  if (options.search) {
    queryBuilder.andWhere('knowledgeBase.name ILIKE :search', {
      search: `%${options.search}%`,
    });
  }

  return queryBuilder;
}
