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
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import { useUpdateKnowledgeBase } from '../api';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { NameField } from '@/widgets/entity-form-fields';

export default function KnowledgeBasePropertiesCard({
  knowledgeBase,
}: Readonly<{
  knowledgeBase: KnowledgeBaseResponseDto;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { form, onSubmit, isLoading } = useUpdateKnowledgeBase({
    knowledgeBase,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.properties.title')}</CardTitle>
        <CardDescription>{t('detail.properties.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <NameField
              control={form.control}
              name="name"
              translationNamespace="knowledge-bases"
              translationPrefix="detail.properties"
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('detail.properties.form.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'detail.properties.form.descriptionPlaceholder',
                      )}
                      className="min-h-[80px] max-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('detail.properties.buttons.saving')
                : t('detail.properties.buttons.save')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
