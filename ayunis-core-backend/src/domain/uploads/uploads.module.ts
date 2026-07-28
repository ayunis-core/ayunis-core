import { Module } from '@nestjs/common';
import { TusUploadService } from './application/services/tus-upload.service';
import { TusUploadController } from './presenters/http/tus-upload.controller';
import { TusUploadCleanupTask } from './infrastructure/tasks/tus-upload-cleanup.task';

@Module({
  controllers: [TusUploadController],
  providers: [TusUploadService, TusUploadCleanupTask],
  exports: [TusUploadService],
})
export class UploadsModule {}
