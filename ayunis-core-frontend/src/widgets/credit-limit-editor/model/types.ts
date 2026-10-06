export interface CreditLimitFields {
  monthlyCredits: string;
}

export type CreditLimitEditorTarget = 'teams' | 'users' | 'default-user';

export interface CreditLimitDialogProps {
  target: CreditLimitEditorTarget;
  id: string;
  name: string;
  initialLimit: number | null;
  onClose: () => void;
}
