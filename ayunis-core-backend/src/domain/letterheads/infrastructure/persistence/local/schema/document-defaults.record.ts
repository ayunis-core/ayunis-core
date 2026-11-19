import type { UUID } from 'crypto';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import type { DocumentFontFamily } from 'src/domain/letterheads/domain/value-objects/document-typography';

@Entity({ name: 'org_document_defaults' })
export class DocumentDefaultsRecord {
  @PrimaryColumn('varchar')
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'varchar', nullable: true })
  fontFamily: DocumentFontFamily | null;

  @Column({ type: 'integer', nullable: true })
  fontSizePt: number | null;
}
