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

  // Same, but acting as a specific user: for event listeners that create
  // resources on behalf of a user who is not the request's principal.
  // `override` matters: the default `inherit` copies the parent store, which
  // includes the publisher's open transaction; the listener would then keep
  // using that transaction after the request committed and released it.
  runForUser<T>(userId: UUID, orgId: UUID, fn: () => Promise<T>): Promise<T> {
    return this.contextService.run({ ifNested: 'override' }, async () => {
      this.contextService.set('userId', userId);
      this.contextService.set('orgId', orgId);
      return fn();
    });
  }
}
