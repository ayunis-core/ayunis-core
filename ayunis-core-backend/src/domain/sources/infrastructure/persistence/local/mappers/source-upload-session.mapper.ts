import { Injectable } from '@nestjs/common';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadSessionRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source-upload-session.record';

@Injectable()
export class SourceUploadSessionMapper {
  toDomain(record: SourceUploadSessionRecord): SourceUploadSession {
    return new SourceUploadSession({
      id: record.id,
      orgId: record.orgId,
      userId: record.userId,
      targetType: record.targetType,
      targetId: record.targetId,
      fileName: record.fileName,
      fileType: record.fileType,
      fileSize: Number(record.fileSize),
      storageKey: record.storageKey,
      expectedETag: record.expectedETag,
      multipart: record.multipart,
      multipartUploadId: record.multipartUploadId,
      status: record.status,
      sources: record.sources,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(session: SourceUploadSession): SourceUploadSessionRecord {
    const record = new SourceUploadSessionRecord();
    record.id = session.id;
    record.orgId = session.orgId;
    record.userId = session.userId;
    record.targetType = session.targetType;
    record.targetId = session.targetId;
    record.fileName = session.fileName;
    record.fileType = session.fileType;
    record.fileSize = String(session.fileSize);
    record.storageKey = session.storageKey;
    record.expectedETag = session.expectedETag;
    record.multipart = session.multipart;
    record.multipartUploadId = session.multipartUploadId;
    record.status = session.status;
    record.sources = session.sources;
    record.expiresAt = session.expiresAt;
    record.createdAt = session.createdAt;
    record.updatedAt = session.updatedAt;
    return record;
  }
}
