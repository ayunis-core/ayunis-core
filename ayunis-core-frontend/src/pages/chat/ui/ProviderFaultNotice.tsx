import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';

interface ProviderFaultNoticeProps {
  modelName: string;
}

export default function ProviderFaultNotice({
  modelName,
}: Readonly<ProviderFaultNoticeProps>) {
  const { t } = useTranslation('chat');

  return (
    <Alert
      variant="warning"
      className="mb-2"
      data-testid="chat-model-provider-fault-alert"
    >
      <TriangleAlert />
      <AlertDescription>
        {t('chat.modelProviderFaultWarning', { modelName })}
      </AlertDescription>
    </Alert>
  );
}
