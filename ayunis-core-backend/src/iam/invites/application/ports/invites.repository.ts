import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Invite } from '../../domain/invite.entity';

@Injectable()
export abstract class InvitesRepository {
  abstract create(invite: Invite): Promise<void>;
  abstract findOne(id: UUID): Promise<Invite | null>;
  abstract findByOrgId(orgId: UUID): Promise<Invite[]>;
  abstract findOneByEmail(email: string): Promise<Invite | null>;
  abstract findByEmailsAndOrg(
    emails: string[],
    orgId: string,
  ): Promise<Invite[]>;
  abstract accept(id: UUID): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
  abstract deleteAllPendingByOrg(orgId: UUID): Promise<number>;
}
