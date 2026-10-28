import type { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'federated_identities' })
@Unique(['issuer', 'subject'])
export class FederatedIdentityRecord extends BaseRecord {
  @Column({ type: 'text' })
  issuer: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Index()
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;
}
