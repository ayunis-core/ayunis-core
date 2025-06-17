import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import storageConfig from '../../config/storage.config';
import { MinioObjectStorageProvider } from './infrastructure/providers/minio-object-storage.provider';
import { StorageController } from './presenters/https/storage.controller';
import { ObjectStoragePort } from './application/ports/object-storage.port';
import { UploadObjectUseCase } from './application/use-cases/upload-object/upload-object.use-case';
import { DownloadObjectUseCase } from './application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from './application/use-cases/get-object-info/get-object-info.use-case';
import { DeleteObjectUseCase } from './application/use-cases/delete-object/delete-object.use-case';
import { GetPresignedUrlUseCase } from './application/use-cases/get-presigned-url/get-presigned-url.use-case';

@Module({
  imports: [ConfigModule.forFeature(storageConfig)],
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
  ],
  exports: [
    ObjectStoragePort,
    UploadObjectUseCase,
    DownloadObjectUseCase,
    GetObjectInfoUseCase,
    DeleteObjectUseCase,
    GetPresignedUrlUseCase,
  ],
})
export class StorageModule {}
