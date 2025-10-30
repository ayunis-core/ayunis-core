import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreatePredefinedMcpIntegrationCommand } from './create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from './create-custom-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  PredefinedMcpIntegration,
  CustomMcpIntegration,
  McpIntegration,
} from '../../../domain/mcp-integration.entity';
import {
  InvalidPredefinedSlugError,
  InvalidServerUrlError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateMcpIntegrationUseCase {
  private readonly logger = new Logger(CreateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  // Overload signatures
  async execute(
    command: CreatePredefinedMcpIntegrationCommand,
  ): Promise<PredefinedMcpIntegration>;
  async execute(
    command: CreateCustomMcpIntegrationCommand,
  ): Promise<CustomMcpIntegration>;

  // Implementation
  async execute(
    command:
      | CreatePredefinedMcpIntegrationCommand
      | CreateCustomMcpIntegrationCommand,
  ): Promise<McpIntegration> {
    // Get orgId from context first (common for both types)
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Determine command type and delegate
    if (command instanceof CreatePredefinedMcpIntegrationCommand) {
      return this.createPredefinedIntegration(command, orgId);
    } else {
      return this.createCustomIntegration(command, orgId);
    }
  }

  private async createPredefinedIntegration(
    command: CreatePredefinedMcpIntegrationCommand,
    orgId: string,
  ): Promise<PredefinedMcpIntegration> {
    this.logger.log('createPredefinedIntegration', { slug: command.slug });

    try {
      // Validate slug exists in registry
      if (!this.registryService.isValidSlug(command.slug)) {
        throw new InvalidPredefinedSlugError(command.slug);
      }

      // Create domain entity (credentials already encrypted by controller)
      const integration = new PredefinedMcpIntegration({
        name: command.name,
        organizationId: orgId,
        slug: command.slug,
        enabled: true,
        authMethod: command.authMethod,
        authHeaderName: command.authHeaderName,
        encryptedCredentials: command.encryptedCredentials,
      });

      // Save to repository
      return (await this.repository.save(
        integration,
      )) as PredefinedMcpIntegration;
    } catch (error) {
      // Re-throw application errors and auth errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error creating predefined integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private async createCustomIntegration(
    command: CreateCustomMcpIntegrationCommand,
    orgId: string,
  ): Promise<CustomMcpIntegration> {
    this.logger.log('createCustomIntegration', {
      serverUrl: command.serverUrl,
    });

    try {
      // Validate URL format (basic validation)
      if (!this.isValidUrl(command.serverUrl)) {
        throw new InvalidServerUrlError(command.serverUrl);
      }

      // Create domain entity (credentials already encrypted by controller)
      const integration = new CustomMcpIntegration({
        name: command.name,
        organizationId: orgId,
        serverUrl: command.serverUrl,
        enabled: true,
        authMethod: command.authMethod,
        authHeaderName: command.authHeaderName,
        encryptedCredentials: command.encryptedCredentials,
      });

      // Save to repository
      return (await this.repository.save(integration)) as CustomMcpIntegration;
    } catch (error) {
      // Re-throw application errors and auth errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error creating custom integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Basic validation: must be http or https
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
