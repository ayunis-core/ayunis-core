import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum KnowledgeBaseErrorCode {
  KNOWLEDGE_BASE_NOT_FOUND = 'KNOWLEDGE_BASE_NOT_FOUND',
  UNEXPECTED_KNOWLEDGE_BASE_ERROR = 'UNEXPECTED_KNOWLEDGE_BASE_ERROR',
  DOCUMENT_NOT_IN_KNOWLEDGE_BASE = 'DOCUMENT_NOT_IN_KNOWLEDGE_BASE',
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

export class UnexpectedKnowledgeBaseError extends KnowledgeBaseError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(
      message,
      KnowledgeBaseErrorCode.UNEXPECTED_KNOWLEDGE_BASE_ERROR,
      500,
      metadata,
    );
  }
}

export class DocumentNotInKnowledgeBaseError extends KnowledgeBaseError {
  constructor(
    documentId: string,
    knowledgeBaseId: string,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Document '${documentId}' not found in knowledge base '${knowledgeBaseId}'`,
      KnowledgeBaseErrorCode.DOCUMENT_NOT_IN_KNOWLEDGE_BASE,
      404,
      metadata,
    );
  }
}
