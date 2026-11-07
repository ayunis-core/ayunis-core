import { Injectable } from '@nestjs/common';
import type { UserContext } from 'src/common/context/required-context';
import { ContextService } from './context.service';

@Injectable()
export class UserContextRunner {
  constructor(private readonly contextService: ContextService) {}

  // Runs `fn` inside a fresh context acting as the given user, with the same
  // four keys the request interceptor sets for a user login; the context is
  // discarded afterwards. For background work done on a user's behalf (queue
  // consumers) whose downstream use cases read the user from the context.
  runAsUser<T>(user: UserContext, fn: () => Promise<T>): Promise<T> {
    return this.contextService.run(async () => {
      this.contextService.set('userId', user.userId);
      this.contextService.set('orgId', user.orgId);
      this.contextService.set('role', user.role);
      this.contextService.set('systemRole', user.systemRole);
      return fn();
    });
  }
}
