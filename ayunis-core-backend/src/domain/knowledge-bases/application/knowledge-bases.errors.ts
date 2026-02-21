import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum KnowledgeBaseErrorCode {
  KNOWLEDGE_BASE_NOT_FOUND = 'KNOWLEDGE_BASE_NOT_FOUND',
}

export abstract class KnowledgeBaseError extends ApplicationError {
  constructor(
    message: string,
    code: KnowledgeBaseErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class KnowledgeBaseNotFoundError extends KnowledgeBaseError {
  constructor(knowledgeBaseId: string, metadata?: ErrorMetadata) {
    super(
      `Knowledge base with ID '${knowledgeBaseId}' not found`,
      KnowledgeBaseErrorCode.KNOWLEDGE_BASE_NOT_FOUND,
      404,
      metadata,
    );
  }
}
