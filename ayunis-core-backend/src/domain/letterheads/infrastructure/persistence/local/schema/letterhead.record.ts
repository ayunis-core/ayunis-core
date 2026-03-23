import { Column, Entity, Index } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import type { PageMargins } from '../../../../domain/value-objects/page-margins';

@Entity({ name: 'letterheads' })
export class LetterheadRecord extends BaseRecord {
  @Column()
  @Index()
  orgId: UUID;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'varchar' })
  firstPageStoragePath: string;

  @Column({ type: 'varchar', nullable: true })
  continuationPageStoragePath: string | null;

  @Column({ type: 'simple-json' })
  firstPageMargins: PageMargins;

  @Column({ type: 'simple-json' })
  continuationPageMargins: PageMargins;
}
