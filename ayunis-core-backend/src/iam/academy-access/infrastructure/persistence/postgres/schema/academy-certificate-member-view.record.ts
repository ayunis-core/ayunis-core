import type { UUID } from 'crypto';
import { DataSource, ViewColumn, ViewEntity } from 'typeorm';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { AcademyCompletionRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-completion.record';

@ViewEntity({
  name: 'academy_certificate_members',
  expression: (dataSource: DataSource) =>
    dataSource
      .createQueryBuilder()
      .select('member.id', 'userId')
      .addSelect('member.orgId', 'orgId')
      .addSelect('member.name', 'name')
      .addSelect('member.email', 'email')
      .addSelect('completion.completedAt', 'completedAt')
      .from(UserRecord, 'member')
      .leftJoin(
        AcademyCompletionRecord,
        'completion',
        'completion.userId = member.id',
      ),
})
export class AcademyCertificateMemberView {
  @ViewColumn()
  userId: UUID;

  @ViewColumn()
  orgId: UUID;

  @ViewColumn()
  name: string;

  @ViewColumn()
  email: string;

  @ViewColumn()
  completedAt: Date | null;
}
