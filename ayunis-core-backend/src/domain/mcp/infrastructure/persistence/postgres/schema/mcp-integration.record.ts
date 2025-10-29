import { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  TableInheritance,
  ChildEntity,
  Unique,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';

/**
 * Abstract base record for all MCP integrations.
 * Uses TypeORM's single-table inheritance pattern with a discriminator column.
 */
@Entity({ name: 'mcp_integrations' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
@Unique(['organizationId', 'name'])
export abstract class McpIntegrationRecord extends BaseRecord {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'auth_method',
  })
  authMethod?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'auth_header_name',
  })
  authHeaderName?: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'encrypted_credentials',
  })
  encryptedCredentials?: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'organization_id' })
  @Index('idx_mcp_integrations_org')
  organizationId: string;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  organization: OrgRecord;
}

/**
 * Predefined MCP integration record with a slug.
 * Discriminator value: 'predefined'
 */
@ChildEntity('predefined')
export class PredefinedMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ type: 'varchar', length: 50 })
  slug: string;
}

/**
 * Custom MCP integration record with a server URL.
 * Discriminator value: 'custom'
 */
@ChildEntity('custom')
export class CustomMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ type: 'text', name: 'server_url' })
  serverUrl: string;
}
