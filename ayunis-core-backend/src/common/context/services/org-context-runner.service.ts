import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from './context.service';

@Injectable()
export class OrgContextRunner {
  constructor(private readonly contextService: ContextService) {}

  // Runs `fn` inside a fresh context scoped to the given organization; the
  // context is discarded afterwards. For entry points without an authenticated
  // request (crons, queue consumers) whose downstream use cases read the orgId
  // from the context.
  runForOrg<T>(orgId: UUID, fn: () => Promise<T>): Promise<T> {
    return this.contextService.run(async () => {
      this.contextService.set('orgId', orgId);
      return fn();
    });
  }
}
