import { UUID } from 'crypto';
import { PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class BaseRecord {
  @PrimaryColumn()
  id: UUID;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
