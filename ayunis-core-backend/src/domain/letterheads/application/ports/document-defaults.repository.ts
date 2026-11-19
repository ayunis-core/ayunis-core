import type { UUID } from 'crypto';
import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';

export abstract class DocumentDefaultsRepository {
  abstract findByOrgId(orgId: UUID): Promise<DocumentTypography | null>;

  abstract upsert(
    orgId: UUID,
    typography: Partial<DocumentTypography>,
  ): Promise<DocumentTypography>;
}
