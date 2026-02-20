import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { Form } from '@/shared/ui/shadcn/form';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import { useUpdateAgent } from '../api';
import { usePermittedModels } from '@/features/usePermittedModels';
import type { AgentResponseDto } from '@/shared/api';
import {
  NameField,
  ModelSelectorField,
  InstructionsField,
} from '@/widgets/entity-form-fields';

export default function AgentPropertiesCard({
  agent,
  disabled = false,
}: Readonly<{
  agent: AgentResponseDto;
  disabled?: boolean;
}>) {
  const { t } = useTranslation('agent');
  const { models } = usePermittedModels();
  const { form, onSubmit, isLoading } = useUpdateAgent({
    agent: agent,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('editDialog.title')}</CardTitle>
        <CardDescription>{t('editDialog.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <NameField
                control={form.control}
                name="name"
                translationNamespace="agent"
                translationPrefix="editDialog"
                disabled={disabled}
              />
              <ModelSelectorField
                control={form.control}
                name="modelId"
                translationNamespace="agent"
                translationPrefix="editDialog"
                models={models}
                disabled={disabled}
              />
            </div>
            <InstructionsField
              control={form.control}
              name="instructions"
              translationNamespace="agent"
              translationPrefix="editDialog"
              disabled={disabled}
              className="min-h-[250px] max-h-[500px]"
            />
            {!disabled && (
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('editDialog.buttons.saving')
                  : t('editDialog.buttons.save')}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
