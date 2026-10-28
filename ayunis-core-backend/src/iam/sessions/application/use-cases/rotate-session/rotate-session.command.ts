import type { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';

export class RotateSessionCommand {
  constructor(public readonly current: RefreshToken) {}
}
