import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { Subject, Observable } from 'rxjs';
import { RunResponse } from '../dto/run-response.dto';

export interface RunSession {
  userId: UUID;
  threadId: UUID;
  messageSubject: Subject<RunResponse>;
  createdAt: Date;
}

@Injectable()
export class RunSessionManager {
  private readonly logger = new Logger(RunSessionManager.name);
  private readonly sessions = new Map<UUID, RunSession[]>();

  createSession(userId: UUID, threadId: UUID): RunSession {
    const session: RunSession = {
      userId,
      threadId,
      messageSubject: new Subject<RunResponse>(),
      createdAt: new Date(),
    };

    const sessions = this.sessions.get(threadId) || [];
    sessions.push(session);
    this.sessions.set(threadId, sessions);
    this.logger.log(`Created session for user ${userId}`);

    // Clean up session after it's been inactive for 30 minutes
    // setTimeout(
    //   () => {
    //     this.closeSession(threadId, userId);
    //   },
    //   30 * 60 * 1000,
    // );

    return session;
  }

  getSession(threadId: UUID, userId: UUID): RunSession | undefined {
    const sessions = this.sessions.get(threadId);
    return sessions?.find((s) => s.userId === userId);
  }

  sendMessageToSessions(threadId: UUID, message: RunResponse): boolean {
    const sessions = this.sessions.get(threadId);
    if (!sessions) {
      this.logger.warn(`Sessions for thread ${threadId} not found`);
      return false;
    }

    sessions.forEach((session) => {
      session.messageSubject.next(message);
    });
    return true;
  }

  closeSession(threadId: UUID, userId: UUID): boolean {
    const sessions = this.sessions.get(threadId);
    if (!sessions) {
      return false;
    }

    const sessionIndex = sessions.findIndex((s) => s.userId === userId);
    if (sessionIndex === -1) {
      return false;
    }

    const session = sessions[sessionIndex];
    session.messageSubject.complete();

    // Remove only this specific session
    sessions.splice(sessionIndex, 1);

    // If no sessions left for this thread, remove the thread entry
    if (sessions.length === 0) {
      this.sessions.delete(threadId);
    }

    this.logger.log(`Closed session for user ${userId} in thread ${threadId}`);
    return true;
  }

  getObservable(
    threadId: UUID,
    sessionId: UUID,
  ): Observable<RunResponse> | undefined {
    const session = this.getSession(threadId, sessionId);
    return session?.messageSubject.asObservable();
  }
}
