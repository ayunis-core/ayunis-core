import { z } from 'zod';

export const creditLimitSearchSchema = z.object({
  tab: z.enum(['teams', 'users']).catch('teams'),
  search: z.string().optional(),
  page: z.number().int().min(1).catch(1),
});
export type CreditLimitSearch = z.infer<typeof creditLimitSearchSchema>;
export type CreditLimitTarget = 'teams' | 'users';
export interface CreditLimitInfo {
  monthlyCredits: number;
  creditsUsed: number;
}
export const CREDIT_LIMIT_PAGE_SIZE = 25;
