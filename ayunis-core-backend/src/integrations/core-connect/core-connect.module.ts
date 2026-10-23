import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreConnectAuthGuard } from './application/guards/core-connect-auth.guard';
import { CoreConnectController } from './presenters/http/core-connect.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CoreConnectController],
  providers: [CoreConnectAuthGuard],
  exports: [CoreConnectAuthGuard],
})
export class CoreConnectModule {}
