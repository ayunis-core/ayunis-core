import { Column, Entity, Unique } from 'typeorm';
import { OparlBodyObjectBase } from './oparl-body-object-base.record';

@Entity({ name: 'oparl_legislative_terms' })
@Unique(['systemId', 'oparlId'])
export class OparlLegislativeTermRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;
}
