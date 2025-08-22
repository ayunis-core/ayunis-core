import { Global, Module } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { ContextService } from 'src/common/context/services/context.service';

@Global()
@Module({
  imports: [ClsModule.forFeature()],
  providers: [
    {
      provide: ContextService,
      useExisting: ClsService,
    },
  ],
  exports: [ContextService],
})
export class ContextModule {}
