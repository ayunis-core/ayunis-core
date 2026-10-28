import type { UUID } from 'crypto';
import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { AcademyCourseModuleRecord } from './academy-course-module.record';

@Entity({ name: 'academy_module_view_times' })
@Unique(['userId', 'courseModuleId'])
export class AcademyModuleViewTimeRecord extends BaseRecord {
  // Lookups by user use the leading column of the unique constraint.
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: UserRecord;

  @Column()
  @Index()
  courseModuleId: UUID;

  @ManyToOne(() => AcademyCourseModuleRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  courseModule: AcademyCourseModuleRecord;

  @Column({ type: 'double precision', default: 0 })
  visibleSeconds: number;

  @Column({ type: 'timestamptz' })
  lastHeartbeatAt: Date;
}
