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
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { McpValidationFailedError } from '../../mcp.errors';

@Injectable()
export class UpdateMcpIntegrationUseCase {
  private readonly logger = new Logger(UpdateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
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

      if (integration.orgId !== orgId) {
        throw new McpIntegrationAccessDeniedError(command.integrationId);
      }

      // Update fields (only if provided)
      if (command.name !== undefined) {
        integration.updateName(command.name);
      }

      if (command.returnsPii !== undefined) {
        integration.updateReturnsPii(command.returnsPii);
      }

      if (
        command.credentials !== undefined ||
        command.authHeaderName !== undefined
      ) {
        await this.rotateCredentials(
          integration,
          command.credentials,
          command.authHeaderName,
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

  private async rotateCredentials(
    integration: McpIntegration,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    const auth = integration.auth;
    const authMethod = auth.getMethod();

    switch (authMethod) {
      case McpAuthMethod.NO_AUTH: {
        if (credentials !== undefined || authHeaderName !== undefined) {
          throw new McpValidationFailedError(
            integration.id,
            integration.name,
            'This integration does not support authentication credentials.',
          );
        }
        return;
      }
      case McpAuthMethod.BEARER_TOKEN: {
        if (authHeaderName !== undefined) {
          throw new McpValidationFailedError(
            integration.id,
            integration.name,
            'Bearer token integrations always use the Authorization header.',
          );
        }

        if (credentials === undefined) {
          return;
        }

        const encryptedToken =
          await this.credentialEncryption.encrypt(credentials);
        (auth as BearerMcpIntegrationAuth).setToken(encryptedToken);
        return;
      }
      case McpAuthMethod.CUSTOM_HEADER: {
        const customAuth = auth as CustomHeaderMcpIntegrationAuth;

        if (credentials !== undefined) {
          const encryptedSecret =
            await this.credentialEncryption.encrypt(credentials);
          const headerNameToUse =
            authHeaderName ?? customAuth.getAuthHeaderName();
          customAuth.setSecret(encryptedSecret, headerNameToUse);
          return;
        }

        if (authHeaderName !== undefined) {
          const currentSecret = customAuth.secret;
          if (!currentSecret) {
            throw new McpValidationFailedError(
              integration.id,
              integration.name,
              'Credentials must be configured before updating the header name.',
            );
          }

          customAuth.setSecret(currentSecret, authHeaderName);
        }
        return;
      }
      case McpAuthMethod.OAUTH: {
        if (credentials !== undefined || authHeaderName !== undefined) {
          throw new McpValidationFailedError(
            integration.id,
            integration.name,
            `Credential rotation is not supported for auth method ${authMethod}.`,
          );
        }
      }
    }
  }
}
