import type { UUID } from 'crypto';
import type { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

export type CompleteMfaLoginOperation = 'verify' | 'confirmEnrollment';

interface CompleteMfaLoginCommandParams {
  userId: UUID;
  code: string;
  operation: CompleteMfaLoginOperation;
  authenticationMethod: SessionAuthenticationMethod;
  zitadelSessionId: string | null;
}

export class CompleteMfaLoginCommand {
  readonly userId: UUID;
  readonly code: string;
  readonly operation: CompleteMfaLoginOperation;
  readonly authenticationMethod: SessionAuthenticationMethod;
  readonly zitadelSessionId: string | null;

  constructor(params: CompleteMfaLoginCommandParams) {
    this.userId = params.userId;
    this.code = params.code;
    this.operation = params.operation;
    this.authenticationMethod = params.authenticationMethod;
    this.zitadelSessionId = params.zitadelSessionId;
  }
}
