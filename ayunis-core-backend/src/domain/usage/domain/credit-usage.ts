/**
 * Domain result object for credit usage information.
 * DTO mapping happens in the controller / presenter layer.
 */
export interface CreditUsage {
  /** Monthly credit budget; null if no usage-based subscription. */
  monthlyCredits: number | null;
  /** Credits consumed in the current calendar month. */
  creditsUsed: number;
  /** Credits remaining; null if no usage-based subscription. */
  creditsRemaining: number | null;
}
