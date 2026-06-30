/**
 * How the current subscription is handled when a super admin changes an
 * organization's subscription (the type/data cannot be mutated in place — the
 * current subscription is ended and a new one is created).
 *
 * - CANCEL: soft-cancel the current subscription (sets cancelledAt), keeping it
 *   in history for billing/audit purposes.
 * - DELETE: hard-delete the current subscription row, leaving no record of it.
 */
export enum OldSubscriptionDisposition {
  CANCEL = 'CANCEL',
  DELETE = 'DELETE',
}
