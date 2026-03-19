import { toast } from 'sonner';

export function showSuccess(message: string) {
  toast.success(message, { position: 'bottom-center', closeButton: true });
}

export function showError(message: string) {
  toast.error(message, { position: 'bottom-center', closeButton: true });
}

export function showInfo(message: string) {
  toast.info(message, { position: 'bottom-center', closeButton: true });
}
