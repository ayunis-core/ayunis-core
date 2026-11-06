import { ChildEntity, Column, Index } from 'typeorm';
import { McpIntegrationRecord } from './mcp-integration.record';
import { McpIntegrationKind } from 'src/domain/mcp/domain/value-objects/mcp-integration-kind.enum';

@ChildEntity(McpIntegrationKind.MARKETPLACE)
@Index(['orgId', 'marketplaceIdentifier'], {
  unique: true,
  where: '"marketplace_identifier" IS NOT NULL',
})
export class MarketplaceMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ name: 'marketplace_identifier' })
  marketplaceIdentifier: string;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({
    name: 'customer_provides_server_url',
    type: 'boolean',
    default: false,
  })
  customerProvidesServerUrl: boolean;

  @Column({ name: 'server_url_hint', type: 'varchar', nullable: true })
  serverUrlHint: string | null;
}
