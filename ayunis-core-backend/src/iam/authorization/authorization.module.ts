import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './application/guards/roles.guard';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [],
})
export class AuthorizationModule {}
