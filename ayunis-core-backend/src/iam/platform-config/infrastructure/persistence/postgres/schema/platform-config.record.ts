import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('platform_config')
export class PlatformConfigRecord {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'varchar' })
  value: string;
}
