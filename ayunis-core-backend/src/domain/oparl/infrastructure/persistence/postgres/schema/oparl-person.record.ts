import { Column, Entity, Unique } from 'typeorm';
import { OparlBodyObjectBase } from './oparl-body-object-base.record';

@Entity({ name: 'oparl_persons' })
@Unique(['systemId', 'oparlId'])
export class OparlPersonRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  familyName: string | null;

  @Column({ type: 'text', nullable: true })
  givenName: string | null;

  @Column({ type: 'text', nullable: true })
  formOfAddress: string | null;

  @Column({ type: 'text', nullable: true })
  affix: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  title: string[] | null;

  @Column({ type: 'text', nullable: true })
  gender: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  status: string[] | null;
}
