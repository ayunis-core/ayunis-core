import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import storageConfig from '../../config/storage.config';
import { MinioObjectStorageProvider } from './infrastructure/providers/minio-object-storage.provider';
import { StorageController } from './presenters/https/storage.controller';
import { StorageResponseDtoMapper } from './presenters/https/mappers/storage-response-dto.mapper';
import { ObjectStoragePort } from './application/ports/object-storage.port';
import { UploadObjectUseCase } from './application/use-cases/upload-object/upload-object.use-case';
import { DownloadObjectUseCase } from './application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from './application/use-cases/get-object-info/get-object-info.use-case';
import { DeleteObjectUseCase } from './application/use-cases/delete-object/delete-object.use-case';
import { GetPresignedUrlUseCase } from './application/use-cases/get-presigned-url/get-presigned-url.use-case';
import { CleanupOrphanedImagesUseCase } from './application/use-cases/cleanup-orphaned-images/cleanup-orphaned-images.use-case';
import { OrphanedImagesCleanupTask } from './infrastructure/tasks/orphaned-images-cleanup.task';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    ConfigModule.forFeature(storageConfig),
    ScheduleModule.forRoot(),
    forwardRef(() => MessagesModule),
  ],
  controllers: [StorageController],
  providers: [
    {
      provide: ObjectStoragePort,
      useClass: MinioObjectStorageProvider,
    },
    UploadObjectUseCase,
    DownloadObjectUseCase,
    GetObjectInfoUseCase,
    DeleteObjectUseCase,
    GetPresignedUrlUseCase,
    CleanupOrphanedImagesUseCase,
    OrphanedImagesCleanupTask,
    StorageResponseDtoMapper,
  ],
  exports: [
    ObjectStoragePort,
    UploadObjectUseCase,
    DownloadObjectUseCase,
    GetObjectInfoUseCase,
    DeleteObjectUseCase,
    GetPresignedUrlUseCase,
    CleanupOrphanedImagesUseCase,
  ],
})
export class StorageModule {}
