import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

export abstract class AuthenticationRepository {
  abstract generateAccessToken(
    user: ActiveUser,
    orgSessionVersion?: number,
  ): Promise<string>;
}
