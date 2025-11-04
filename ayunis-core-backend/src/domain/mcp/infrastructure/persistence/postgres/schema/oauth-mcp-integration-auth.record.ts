import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';

@ChildEntity('OAUTH')
export class OAuthMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {
  @Column({ name: 'client_id', nullable: true })
  clientId?: string;

  @Column({ name: 'client_secret', type: 'text', nullable: true })
  clientSecret?: string;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken?: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt?: Date;
}
