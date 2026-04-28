import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { ContextService } from 'src/common/context/services/context.service';

@Global()
@Module({
  imports: [ClsModule.forFeature()],
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
