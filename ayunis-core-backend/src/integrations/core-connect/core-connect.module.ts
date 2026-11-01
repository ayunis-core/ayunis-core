import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreConnectAuthGuard } from './core-connect-auth.guard';

@Module({
  imports: [ConfigModule],
  providers: [CoreConnectAuthGuard],
  exports: [CoreConnectAuthGuard],
})
export class CoreConnectModule {}
