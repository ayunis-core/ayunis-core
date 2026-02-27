import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum SkillErrorCode {
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  SKILL_INVALID_INPUT = 'SKILL_INVALID_INPUT',
  DUPLICATE_SKILL_NAME = 'DUPLICATE_SKILL_NAME',
  SOURCE_ALREADY_ASSIGNED = 'SOURCE_ALREADY_ASSIGNED',
  MCP_INTEGRATION_NOT_FOUND = 'MCP_INTEGRATION_NOT_FOUND',
  MCP_INTEGRATION_ALREADY_ASSIGNED = 'MCP_INTEGRATION_ALREADY_ASSIGNED',
  MCP_INTEGRATION_DISABLED = 'MCP_INTEGRATION_DISABLED',
  MCP_INTEGRATION_WRONG_ORGANIZATION = 'MCP_INTEGRATION_WRONG_ORGANIZATION',
  MCP_INTEGRATION_NOT_ASSIGNED = 'MCP_INTEGRATION_NOT_ASSIGNED',
  KNOWLEDGE_BASE_NOT_FOUND = 'KNOWLEDGE_BASE_NOT_FOUND',
  KNOWLEDGE_BASE_ALREADY_ASSIGNED = 'KNOWLEDGE_BASE_ALREADY_ASSIGNED',
  KNOWLEDGE_BASE_WRONG_ORGANIZATION = 'KNOWLEDGE_BASE_WRONG_ORGANIZATION',
  KNOWLEDGE_BASE_NOT_ASSIGNED = 'KNOWLEDGE_BASE_NOT_ASSIGNED',
  MISSING_FILE = 'MISSING_FILE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  EMPTY_FILE_DATA = 'EMPTY_FILE_DATA',
  MARKETPLACE_INSTALL_FAILED = 'MARKETPLACE_INSTALL_FAILED',
  SKILL_NOT_ACTIVE = 'SKILL_NOT_ACTIVE',
  UNEXPECTED_SKILL_ERROR = 'UNEXPECTED_SKILL_ERROR',
}

export abstract class SkillError extends ApplicationError {
  constructor(
    message: string,
    code: SkillErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class SkillNotFoundError extends SkillError {
  constructor(skillId: string, metadata?: ErrorMetadata) {
    super(
      `Skill with ID ${skillId} not found`,
      SkillErrorCode.SKILL_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class DuplicateSkillNameError extends SkillError {
  constructor(name: string, metadata?: ErrorMetadata) {
    super(
      `A skill with the name "${name}" already exists`,
      SkillErrorCode.DUPLICATE_SKILL_NAME,
      409,
      metadata,
    );
  }
}

export class SkillInvalidInputError extends SkillError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid skill input: ${reason}`,
      SkillErrorCode.SKILL_INVALID_INPUT,
      400,
      metadata,
    );
  }
}

export class SkillSourceAlreadyAssignedError extends SkillError {
  constructor(sourceId: string, metadata?: ErrorMetadata) {
    super(
      `Source with ID ${sourceId} is already assigned to this skill`,
      SkillErrorCode.SOURCE_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

export class SkillMcpIntegrationNotFoundError extends SkillError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} not found`,
      SkillErrorCode.MCP_INTEGRATION_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class SkillMcpIntegrationAlreadyAssignedError extends SkillError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is already assigned to this skill`,
      SkillErrorCode.MCP_INTEGRATION_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

export class SkillMcpIntegrationDisabledError extends SkillError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is disabled`,
      SkillErrorCode.MCP_INTEGRATION_DISABLED,
      400,
      metadata,
    );
  }
}

export class SkillMcpIntegrationWrongOrganizationError extends SkillError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} does not belong to your organization`,
      SkillErrorCode.MCP_INTEGRATION_WRONG_ORGANIZATION,
      403,
      metadata,
    );
  }
}

export class SkillMcpIntegrationNotAssignedError extends SkillError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is not assigned to this skill`,
      SkillErrorCode.MCP_INTEGRATION_NOT_ASSIGNED,
      404,
      metadata,
    );
  }
}

export class SkillKnowledgeBaseNotFoundError extends SkillError {
  constructor(knowledgeBaseId: string, metadata?: ErrorMetadata) {
    super(
      `Knowledge base with ID ${knowledgeBaseId} not found`,
      SkillErrorCode.KNOWLEDGE_BASE_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class SkillKnowledgeBaseAlreadyAssignedError extends SkillError {
  constructor(knowledgeBaseId: string, metadata?: ErrorMetadata) {
    super(
      `Knowledge base with ID ${knowledgeBaseId} is already assigned to this skill`,
      SkillErrorCode.KNOWLEDGE_BASE_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

export class SkillKnowledgeBaseWrongOrganizationError extends SkillError {
  constructor(knowledgeBaseId: string, metadata?: ErrorMetadata) {
    super(
      `Knowledge base with ID ${knowledgeBaseId} does not belong to your organization`,
      SkillErrorCode.KNOWLEDGE_BASE_WRONG_ORGANIZATION,
      403,
      metadata,
    );
  }
}

export class SkillKnowledgeBaseNotAssignedError extends SkillError {
  constructor(knowledgeBaseId: string, metadata?: ErrorMetadata) {
    super(
      `Knowledge base with ID ${knowledgeBaseId} is not assigned to this skill`,
      SkillErrorCode.KNOWLEDGE_BASE_NOT_ASSIGNED,
      404,
      metadata,
    );
  }
}

export class MissingFileError extends SkillError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'No file was provided in the request',
      SkillErrorCode.MISSING_FILE,
      400,
      metadata,
    );
  }
}

export class UnsupportedFileTypeError extends SkillError {
  constructor(
    fileType: string,
    supportedTypes: string[],
    metadata?: ErrorMetadata,
  ) {
    super(
      `File type '${fileType}' is not supported. Supported types: ${supportedTypes.join(', ')}`,
      SkillErrorCode.UNSUPPORTED_FILE_TYPE,
      400,
      metadata,
    );
  }
}

export class EmptyFileDataError extends SkillError {
  constructor(fileName: string, metadata?: ErrorMetadata) {
    super(
      `The file '${fileName}' contains no processable data`,
      SkillErrorCode.EMPTY_FILE_DATA,
      400,
      { fileName, ...metadata },
    );
  }
}

export class MarketplaceInstallFailedError extends SkillError {
  constructor(identifier: string, metadata?: ErrorMetadata) {
    super(
      `Failed to install marketplace skill: ${identifier}`,
      SkillErrorCode.MARKETPLACE_INSTALL_FAILED,
      500,
      { identifier, ...metadata },
    );
  }
}

export class SkillNotActiveError extends SkillError {
  constructor(skillId: string, metadata?: ErrorMetadata) {
    super(
      `Skill with ID ${skillId} is not active and cannot be pinned`,
      SkillErrorCode.SKILL_NOT_ACTIVE,
      400,
      metadata,
    );
  }
}

export class UnexpectedSkillError extends SkillError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      SkillErrorCode.UNEXPECTED_SKILL_ERROR,
      500,
      { error },
    );
  }
}
