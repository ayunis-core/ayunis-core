import { Global, Module } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { ContextService } from 'src/common/context/services/context.service';
import { OrgContextRunner } from 'src/common/context/services/org-context-runner.service';
import { UserContextRunner } from 'src/common/context/services/user-context-runner.service';

@Global()
@Module({
  imports: [ClsModule.forFeature()],
  providers: [
    {
      provide: ContextService,
      useExisting: ClsService,
    },
    OrgContextRunner,
    UserContextRunner,
  ],
  exports: [ContextService, OrgContextRunner, UserContextRunner],
})
export class ContextModule {}
