import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import storageConfig from 'src/config/storage.config';
import { MinioObjectStorageProvider } from './infrastructure/providers/minio-object-storage.provider';
import { ObjectStoragePort } from './application/ports/object-storage.port';
import { UploadObjectUseCase } from './application/use-cases/upload-object/upload-object.use-case';
import { UploadOrgObjectUseCase } from './application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadSystemObjectUseCase } from './application/use-cases/upload-system-object/upload-system-object.use-case';
import { DownloadObjectUseCase } from './application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from './application/use-cases/get-object-info/get-object-info.use-case';
import { DeleteObjectUseCase } from './application/use-cases/delete-object/delete-object.use-case';
import { ListObjectsUseCase } from './application/use-cases/list-objects/list-objects.use-case';
import { ListObjectSummariesUseCase } from './application/use-cases/list-object-summaries/list-object-summaries.use-case';
import { PurgeOrgStorageUseCase } from './application/use-cases/purge-org-storage/purge-org-storage.use-case';
import { PurgeStoragePrefixesUseCase } from './application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { SweepOrphanStorageUseCase } from './application/use-cases/sweep-orphan-storage/sweep-orphan-storage.use-case';
import { StorageOrgDeletionRequestedListener } from './application/listeners/org-deletion-requested.listener';
import { OrphanStorageSweepTask } from './infrastructure/tasks/orphan-storage-sweep.task';
import { PresignUploadRequestUseCase } from './application/use-cases/presign-upload-request/presign-upload-request.use-case';
import { AbortMultipartUploadUseCase } from './application/use-cases/abort-multipart-upload/abort-multipart-upload.use-case';
import { ListIncompleteUploadsUseCase } from './application/use-cases/list-incomplete-uploads/list-incomplete-uploads.use-case';
import { OrgsModule } from 'src/iam/orgs/orgs.module';

const DIRECT_UPLOAD_USE_CASES = [
  PresignUploadRequestUseCase,
  AbortMultipartUploadUseCase,
  ListIncompleteUploadsUseCase,
];

@Module({
  imports: [ConfigModule.forFeature(storageConfig), OrgsModule],
  providers: [
    {
      provide: ObjectStoragePort,
      useClass: MinioObjectStorageProvider,
    },
    UploadObjectUseCase,
    UploadOrgObjectUseCase,
    UploadSystemObjectUseCase,
    DownloadObjectUseCase,
    GetObjectInfoUseCase,
    DeleteObjectUseCase,
    ListObjectsUseCase,
    ListObjectSummariesUseCase,
    PurgeOrgStorageUseCase,
    PurgeStoragePrefixesUseCase,
    SweepOrphanStorageUseCase,
    StorageOrgDeletionRequestedListener,
    OrphanStorageSweepTask,
    ...DIRECT_UPLOAD_USE_CASES,
  ],
  exports: [
    ObjectStoragePort,
    UploadOrgObjectUseCase,
    UploadSystemObjectUseCase,
    DownloadObjectUseCase,
    GetObjectInfoUseCase,
    DeleteObjectUseCase,
    ListObjectsUseCase,
    ListObjectSummariesUseCase,
    PurgeOrgStorageUseCase,
    PurgeStoragePrefixesUseCase,
    ...DIRECT_UPLOAD_USE_CASES,
  ],
})
export class StorageModule {}
