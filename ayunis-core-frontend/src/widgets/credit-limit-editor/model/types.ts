import type { CreditLimitScope } from '@/shared/api';

export interface CreditLimitFields {
  monthlyCredits: string;
}

export type CreditLimitEditorTarget = Exclude<
  CreditLimitScope,
  typeof CreditLimitScope.API_KEY
>;

export interface CreditLimitDialogProps {
  target: CreditLimitEditorTarget;
  id: string;
  name: string;
  initialLimit: number | null;
  onClose: () => void;
}
