import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { McpIntegration } from '../../../domain/mcp-integration.entity';

@Injectable()
export class UpdateMcpIntegrationUseCase {
  private readonly logger = new Logger(UpdateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('updateMcpIntegration', { id: command.integrationId });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(
        command.integrationId as UUID,
      );
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(command.integrationId);
      }

      // Update fields (only if provided)
      if (command.name !== undefined) {
        integration.updateName(command.name);
      }

      if (command.authMethod !== undefined) {
        integration.updateAuth(
          command.authMethod,
          command.authHeaderName,
          command.encryptedCredentials,
        );
      }

      return await this.repository.save(integration);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error updating integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
