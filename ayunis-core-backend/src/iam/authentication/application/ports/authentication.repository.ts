import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';

export abstract class AuthenticationRepository {
  abstract generateTokens(user: ActiveUser): Promise<AuthTokens>;
}
