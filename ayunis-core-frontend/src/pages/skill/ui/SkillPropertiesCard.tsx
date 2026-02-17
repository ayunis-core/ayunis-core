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
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import { useUpdateSkill } from '../api';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export default function SkillPropertiesCard({
  skill,
  disabled = false,
}: {
  skill: SkillResponseDto;
  disabled?: boolean;
}) {
  const { t } = useTranslation('skill');
  const { form, onSubmit, isLoading } = useUpdateSkill({ skill });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('properties.title')}</CardTitle>
        <CardDescription>{t('properties.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('properties.form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('properties.form.namePlaceholder')}
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
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('properties.form.shortDescriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'properties.form.shortDescriptionPlaceholder',
                      )}
                      className="min-h-[80px] max-h-[200px]"
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
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('properties.form.instructionsLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('properties.form.instructionsPlaceholder')}
                      className="min-h-[250px] max-h-[500px]"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading || disabled}>
              {isLoading
                ? t('properties.buttons.saving')
                : t('properties.buttons.save')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
