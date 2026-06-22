import {
  Entity,
  Column,
  Index,
  ManyToOne,
  TableInheritance,
  ChildEntity,
} from 'typeorm';
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
 * A monthly credit allowance for a single user or a team, persisted via
 * single-table inheritance: the `scope` discriminator selects the subtype, each
 * of which owns its own target FK. Instantiating the correct subtype guarantees
 * exactly one target is set.
 */
@Entity('credit_limits')
@TableInheritance({ column: { type: 'varchar', name: 'scope' } })
export abstract class CreditLimitRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    transformer: decimalTransformer,
  })
  monthlyCredits: number;
}

// Target columns are nullable at the DB level: rows of the other subtype leave
// them null (single-table inheritance shares one table). The partial unique
// index guarantees at most one limit per user.
@ChildEntity(CreditLimitScope.USER)
@Index(['orgId', 'userId'], {
  unique: true,
  where: '"userId" IS NOT NULL',
})
export class UserCreditLimitRecord extends CreditLimitRecord {
  @Column({ nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  user: UserRecord | null;
}

@ChildEntity(CreditLimitScope.TEAM)
@Index(['orgId', 'teamId'], {
  unique: true,
  where: '"teamId" IS NOT NULL',
})
export class TeamCreditLimitRecord extends CreditLimitRecord {
  @Column({ nullable: true })
  teamId: UUID | null;

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'CASCADE' })
  team: TeamRecord | null;
}
