import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Invite } from '../../domain/invite.entity';
import { Paginated } from 'src/common/pagination/paginated.entity';

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
  abstract findOne(id: UUID): Promise<Invite | null>;
  abstract findByOrgIdPaginated(
    orgId: UUID,
    pagination: InvitesPagination,
    filters?: InvitesFilters,
  ): Promise<Paginated<Invite>>;
  abstract findOneByEmail(email: string): Promise<Invite | null>;
  abstract findByEmailsAndOrg(
    emails: string[],
    orgId: string,
  ): Promise<Invite[]>;
  abstract accept(id: UUID): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
  abstract deleteAllPendingByOrg(orgId: UUID): Promise<number>;
}
