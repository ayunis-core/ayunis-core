import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import {
  SourceUploadExpiredError,
  SourceUploadNotFoundError,
} from 'src/domain/sources/application/sources.errors';

/**
 * Resolves an upload session for the calling user. A session owned by another
 * user or organisation reads as not found, so the transfer endpoints never
 * confirm that someone else's upload exists.
 */
@Injectable()
export class SourceUploadSessionAccessService {
  constructor(
    private readonly sessions: SourceUploadSessionRepository,
    private readonly contextService: ContextService,
  ) {}

  async requireOwned(uploadId: UUID): Promise<SourceUploadSession> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const session = await this.sessions.findById(uploadId);
    if (session?.userId !== userId || session.orgId !== orgId) {
      throw new SourceUploadNotFoundError(uploadId);
    }
    return session;
  }

  /** A session the browser may still transfer bytes for. */
  async requireTransferable(uploadId: UUID): Promise<SourceUploadSession> {
    const session = await this.requireOwned(uploadId);
    if (
      session.status !== SourceUploadSessionStatus.PENDING ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new SourceUploadExpiredError(uploadId);
    }
    return session;
  }
}
