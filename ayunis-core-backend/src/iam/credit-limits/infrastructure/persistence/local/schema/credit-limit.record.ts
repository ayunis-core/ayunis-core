import { Entity, Column, Index, ManyToOne, JoinColumn, Check } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';
import { TeamRecord } from '../../../../../teams/infrastructure/repositories/local/schema/team.record';
import { CreditLimitScope } from '../../../../domain/value-objects/credit-limit-scope.enum';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

/**
 * A monthly credit allowance for a single user or a team. Exactly one of
 * `targetUserId` / `targetTeamId` is set (enforced by the XOR check). Unique
 * partial indexes guarantee at most one limit per user and per team.
 */
@Entity('credit_limits')
@Index(['orgId', 'targetUserId'], {
  unique: true,
  where: '"target_user_id" IS NOT NULL',
})
@Index(['orgId', 'targetTeamId'], {
  unique: true,
  where: '"target_team_id" IS NOT NULL',
})
@Check(
  'CHK_credit_limit_target_xor',
  `("target_user_id" IS NULL) <> ("target_team_id" IS NULL)`,
)
export class CreditLimitRecord extends BaseRecord {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: OrgRecord;

  @Column({ type: 'enum', enum: CreditLimitScope })
  scope: CreditLimitScope;

  @Column({ name: 'target_user_id', type: 'uuid', nullable: true })
  targetUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: UserRecord | null;

  @Column({ name: 'target_team_id', type: 'uuid', nullable: true })
  targetTeamId: UUID | null;

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_team_id' })
  targetTeam: TeamRecord | null;

  @Column({
    name: 'monthly_credits',
    type: 'decimal',
    precision: 16,
    scale: 2,
    transformer: decimalTransformer,
  })
  monthlyCredits: number;
}
