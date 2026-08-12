import type { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';

export abstract class SsoLoginTransactionsRepository {
  abstract save(transaction: SsoLoginTransaction): Promise<SsoLoginTransaction>;

  abstract consume(
    stateHash: string,
    browserBindingHash: string,
    consumedAt: Date,
  ): Promise<SsoLoginTransaction | null>;

  abstract deleteExpired(now: Date): Promise<number>;
}
