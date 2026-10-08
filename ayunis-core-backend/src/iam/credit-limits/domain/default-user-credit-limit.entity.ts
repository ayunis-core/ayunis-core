import { CreditLimit } from './credit-limit.entity';

/**
 * The organization-wide personal limit applied to every user who has no
 * individual `UserCreditLimit`. At most one per organization.
 */
export class DefaultUserCreditLimit extends CreditLimit {}
