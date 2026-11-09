import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { Sort } from 'src/common/sorting/sort';
import type { InvitesSortField } from 'src/iam/invites/domain/invites-sort-field.enum';

export interface InvitesPagination {
  limit: number;
  offset: number;
}

export interface InvitesFilters {
  search?: string;
  onlyPending?: boolean;
}

@Injectable()
export abstract class InvitesRepository {
  abstract create(invite: Invite): Promise<void>;
  abstract createMany(invites: Invite[]): Promise<void>;
  abstract findOne(id: UUID): Promise<Invite | null>;
  abstract findByOrgIdPaginated(
    orgId: UUID,
    pagination: InvitesPagination,
    filters: InvitesFilters,
    sort: Sort<InvitesSortField>,
  ): Promise<Paginated<Invite>>;
  abstract findOneByEmail(email: string): Promise<Invite | null>;
  abstract findOneByEmailAndOrg(
    email: string,
    orgId: UUID,
  ): Promise<Invite | null>;
  abstract findByEmails(emails: string[]): Promise<Invite[]>;
  abstract findExpiredPendingByOrg(orgId: UUID, now: Date): Promise<Invite[]>;
  abstract accept(id: UUID): Promise<boolean>;
  abstract expirePendingByIds(ids: UUID[], expiresAt: Date): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
  abstract deletePendingByIdAndOrg(id: UUID, orgId: UUID): Promise<boolean>;
  /** Returns the ids of the invites that were still pending and got deleted. */
  abstract deletePendingByIds(ids: UUID[]): Promise<UUID[]>;
  abstract deleteAllPendingByOrg(orgId: UUID): Promise<number>;
}
