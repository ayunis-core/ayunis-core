import type { UUID } from 'crypto';
import { Column, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { OparlObjectBase } from './oparl-object-base.record';
import type { OparlBodyRecord } from './oparl-body.record';

/**
 * An object listed under, or embedded in an object of, a body. The body is
 * named rather than imported: the body record imports the location record,
 * which extends this class.
 */
export abstract class OparlBodyObjectBase extends OparlObjectBase {
  @Index()
  @Column({ type: 'uuid' })
  bodyId: UUID;

  @ManyToOne('OparlBodyRecord', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bodyId' })
  body: Relation<OparlBodyRecord>;
}
