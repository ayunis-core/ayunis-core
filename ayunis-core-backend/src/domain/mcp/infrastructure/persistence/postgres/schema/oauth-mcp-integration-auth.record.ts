import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';
import { McpAuthMethod } from '../../../../domain';

@ChildEntity(McpAuthMethod.OAUTH)
export class OAuthMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {
  @Column({ nullable: true })
  clientId?: string;

  @Column({ type: 'text', nullable: true })
  clientSecret?: string;

  @Column({ type: 'text', nullable: true })
  accessToken?: string;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt?: Date;
}
