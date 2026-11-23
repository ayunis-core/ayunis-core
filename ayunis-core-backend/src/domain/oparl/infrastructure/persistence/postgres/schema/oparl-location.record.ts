import { Column, Entity, Unique } from 'typeorm';
import { OparlBodyObjectBase } from './oparl-body-object-base.record';

@Entity({ name: 'oparl_locations' })
@Unique(['systemId', 'oparlId'])
export class OparlLocationRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  streetAddress: string | null;

  @Column({ type: 'text', nullable: true })
  room: string | null;

  @Column({ type: 'text', nullable: true })
  postalCode: string | null;

  @Column({ type: 'text', nullable: true })
  subLocality: string | null;

  @Column({ type: 'text', nullable: true })
  locality: string | null;
}
