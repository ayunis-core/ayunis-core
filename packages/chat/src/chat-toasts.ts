import { toast } from '@ayunis/ui/lib/toast';

export function showError(message: string): void {
  toast.error(message, { position: 'bottom-center', closeButton: true });
}

export function showSuccess(message: string): void {
  toast.success(message, { position: 'bottom-center', closeButton: true });
}
