export interface CreditLimitFields {
  monthlyCredits: string;
}

export interface CreditLimitDialogProps {
  target: 'teams' | 'users';
  id: string;
  name: string;
  initialLimit: number | null;
  onClose: () => void;
}
