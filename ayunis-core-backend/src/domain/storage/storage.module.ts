import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import storageConfig from '../../config/storage.config';
import { MinioObjectStorageProvider } from './infrastructure/providers/minio-object-storage.provider';
import { ObjectStoragePort } from './application/ports/object-storage.port';
import { UploadObjectUseCase } from './application/use-cases/upload-object/upload-object.use-case';
import { DownloadObjectUseCase } from './application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from './application/use-cases/get-object-info/get-object-info.use-case';
import { DeleteObjectUseCase } from './application/use-cases/delete-object/delete-object.use-case';
import { ListObjectsUseCase } from './application/use-cases/list-objects/list-objects.use-case';
import { GetPresignedUrlUseCase } from './application/use-cases/get-presigned-url/get-presigned-url.use-case';
import { PurgeOrgStorageUseCase } from './application/use-cases/purge-org-storage/purge-org-storage.use-case';
import { PurgeStoragePrefixesUseCase } from './application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { StorageOrgDeletionRequestedListener } from './application/listeners/org-deletion-requested.listener';

@Module({
  imports: [ConfigModule.forFeature(storageConfig)],
  providers: [
    {
      provide: ObjectStoragePort,
      useClass: MinioObjectStorageProvider,
    },
    UploadObjectUseCase,
    DownloadObjectUseCase,
    GetObjectInfoUseCase,
    DeleteObjectUseCase,
    ListObjectsUseCase,
    GetPresignedUrlUseCase,
    PurgeOrgStorageUseCase,
    PurgeStoragePrefixesUseCase,
    StorageOrgDeletionRequestedListener,
  ],
  exports: [
    ObjectStoragePort,
    UploadObjectUseCase,
    DownloadObjectUseCase,
    GetObjectInfoUseCase,
    DeleteObjectUseCase,
    ListObjectsUseCase,
    GetPresignedUrlUseCase,
    PurgeOrgStorageUseCase,
    PurgeStoragePrefixesUseCase,
  ],
})
export class StorageModule {}
