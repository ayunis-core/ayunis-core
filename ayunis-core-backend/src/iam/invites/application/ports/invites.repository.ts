import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Invite } from '../../domain/invite.entity';
import { Paginated } from 'src/common/pagination';

export interface FindByOrgIdOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export abstract class InvitesRepository {
  abstract create(invite: Invite): Promise<void>;
  abstract findOne(id: UUID): Promise<Invite | null>;
  abstract findByOrgId(orgId: UUID): Promise<Invite[]>;
  abstract findByOrgIdPaginated(
    orgId: UUID,
    options?: FindByOrgIdOptions,
  ): Promise<Paginated<Invite>>;
  abstract findOneByEmail(email: string): Promise<Invite | null>;
  abstract accept(id: UUID): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
}
