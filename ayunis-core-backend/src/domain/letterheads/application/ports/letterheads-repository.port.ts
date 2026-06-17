import type { UUID } from 'crypto';
import type { Letterhead } from '../../domain/letterhead.entity';

export abstract class LetterheadsRepository {
  abstract findAllByOrgId(orgId: UUID): Promise<Letterhead[]>;
  abstract findById(orgId: UUID, id: UUID): Promise<Letterhead | null>;
  abstract save(letterhead: Letterhead): Promise<Letterhead>;
  abstract delete(orgId: UUID, id: UUID): Promise<void>;
}
