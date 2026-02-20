import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import { useUpdateAgent } from '../api';
import { usePermittedModels } from '@/features/usePermittedModels';
import type { AgentResponseDto } from '@/shared/api';

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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('editDialog.form.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('editDialog.form.namePlaceholder')}
                        disabled={disabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('editDialog.form.modelLabel')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t('editDialog.form.modelPlaceholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('editDialog.form.instructionsLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('editDialog.form.instructionsPlaceholder')}
                      className="min-h-[250px] max-h-[500px]"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
