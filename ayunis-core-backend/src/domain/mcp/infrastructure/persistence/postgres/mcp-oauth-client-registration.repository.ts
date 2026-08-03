import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { IsNull, Not, type Repository } from 'typeorm';
import { McpOAuthClientRegistrationRepositoryPort } from '../../../application/ports/mcp-oauth-client-registration.repository.port';
import type { McpOAuthClientRegistration } from '../../../domain/mcp-oauth-client-registration.entity';
import { McpOAuthClientRegistrationMapper } from './mappers/mcp-oauth-client-registration.mapper';
import { McpOAuthClientRegistrationRecord } from './schema/mcp-oauth-client-registration.record';

@Injectable()
export class McpOAuthClientRegistrationRepository extends McpOAuthClientRegistrationRepositoryPort {
  constructor(
    @InjectRepository(McpOAuthClientRegistrationRecord)
    private readonly repository: Repository<McpOAuthClientRegistrationRecord>,
  ) {
    super();
  }

  async findByIntegrationAndIssuer(
    integrationId: UUID,
    issuer: string,
  ): Promise<McpOAuthClientRegistration | null> {
    const record = await this.repository.findOne({
      where: { integrationId, issuer },
    });
    return record ? McpOAuthClientRegistrationMapper.toDomain(record) : null;
  }

  async findUnboundByIntegration(
    integrationId: UUID,
  ): Promise<McpOAuthClientRegistration | null> {
    const record = await this.repository.findOne({
      where: { integrationId, issuer: IsNull() },
    });
    return record ? McpOAuthClientRegistrationMapper.toDomain(record) : null;
  }

  hasStaticRegistration(integrationId: UUID): Promise<boolean> {
    return this.repository.exists({
      where: { integrationId, registrationMode: 'static' },
    });
  }

  async save(
    registration: McpOAuthClientRegistration,
  ): Promise<McpOAuthClientRegistration> {
    const saved = await this.repository.save(
      McpOAuthClientRegistrationMapper.toRecord(registration),
    );
    return McpOAuthClientRegistrationMapper.toDomain(saved);
  }

  async bindUnboundToIssuer(
    integrationId: UUID,
    issuer: string,
  ): Promise<McpOAuthClientRegistration | null> {
    return this.repository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(
        McpOAuthClientRegistrationRecord,
      );
      const record = await repository.findOne({
        where: { integrationId, issuer: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) return null;
      record.issuer = issuer;
      return McpOAuthClientRegistrationMapper.toDomain(
        await repository.save(record),
      );
    });
  }

  async deleteByIntegration(integrationId: UUID): Promise<void> {
    await this.repository.delete({ integrationId });
  }

  async deleteByIntegrationExcept(
    integrationId: UUID,
    registrationId: UUID,
  ): Promise<void> {
    await this.repository.delete({ integrationId, id: Not(registrationId) });
  }
}
