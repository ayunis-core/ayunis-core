import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

export abstract class AuthenticationRepository {
  abstract generateAccessToken(user: ActiveUser): Promise<string>;
}
