import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { Subject, Observable } from 'rxjs';
import { RunResponse } from '../dto/run-response.dto';

@Injectable()
export class ThreadEventBroadcaster {
  private readonly logger = new Logger(ThreadEventBroadcaster.name);
  private readonly threadSubjects = new Map<UUID, Subject<RunResponse>>();
  private readonly connectionCounts = new Map<UUID, number>();

  getThreadStream(threadId: UUID): Observable<RunResponse> {
    if (!this.threadSubjects.has(threadId)) {
      this.logger.log(`Creating new event stream for thread ${threadId}`);
      this.threadSubjects.set(threadId, new Subject<RunResponse>());
      this.connectionCounts.set(threadId, 0);
    }

    const currentConnections = this.connectionCounts.get(threadId) || 0;
    this.connectionCounts.set(threadId, currentConnections + 1);

    return this.threadSubjects.get(threadId)!.asObservable();
  }

  broadcastToThread(threadId: UUID, event: RunResponse): boolean {
    const subject = this.threadSubjects.get(threadId);
    if (!subject) {
      this.logger.warn(`No event stream found for thread ${threadId}`);
      return false;
    }

    try {
      subject.next(event);
      return true;
    } catch (error) {
      this.logger.error(`Error broadcasting to thread ${threadId}`, error);
      return false;
    }
  }

  onConnectionDisconnect(threadId: UUID): void {
    const currentConnections = this.connectionCounts.get(threadId) || 0;
    const newConnections = Math.max(0, currentConnections - 1);

    this.connectionCounts.set(threadId, newConnections);
    this.logger.debug(`Connection disconnected from thread ${threadId}`, {
      remainingConnections: newConnections,
    });

    if (newConnections === 0) {
      setTimeout(() => {
        this.cleanupThreadIfEmpty(threadId);
      }, 30000); // 30 second grace period
    }
  }

  private cleanupThreadIfEmpty(threadId: UUID): void {
    const connections = this.connectionCounts.get(threadId) || 0;
    if (connections === 0) {
      this.logger.log(`Cleaning up thread ${threadId} - no active connections`);

      const subject = this.threadSubjects.get(threadId);
      if (subject) {
        subject.complete();
        this.threadSubjects.delete(threadId);
      }
      this.connectionCounts.delete(threadId);
    }
  }

  getConnectionCount(threadId: UUID): number {
    return this.connectionCounts.get(threadId) || 0;
  }

  forceCleanupThread(threadId: UUID): void {
    this.logger.log(`Force cleaning up thread ${threadId}`);

    const subject = this.threadSubjects.get(threadId);
    if (subject) {
      subject.complete();
      this.threadSubjects.delete(threadId);
    }
    this.connectionCounts.delete(threadId);
  }
}
