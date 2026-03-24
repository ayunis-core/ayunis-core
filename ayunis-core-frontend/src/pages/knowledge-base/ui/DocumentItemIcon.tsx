import { Clock, Loader2, AlertCircle, Globe, FileText } from 'lucide-react';

export function DocumentItemIcon({
  isWeb,
  isProcessing,
  isProcessingSlow,
  isFailed,
}: Readonly<{
  isWeb: boolean;
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
}>) {
  if (isProcessingSlow) {
    return <Clock className="h-3.5 w-3.5 shrink-0 text-warning" />;
  }
  if (isProcessing) {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />;
  }
  if (isFailed) {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0" />;
  }
  const Icon = isWeb ? Globe : FileText;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}
