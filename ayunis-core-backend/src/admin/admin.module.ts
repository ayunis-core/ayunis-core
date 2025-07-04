import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './presenters/http/admin.controller';
import { ModelsModule } from '../domain/models/models.module';
import { AdminGuard } from './application/guards/admin.guard';
import { adminConfig } from '../config/admin.config';

@Module({
  imports: [ModelsModule, ConfigModule.forFeature(adminConfig)],
  controllers: [AdminController],
  providers: [AdminGuard],
  exports: [AdminGuard],
})
export class AdminModule {}
