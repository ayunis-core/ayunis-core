import type {
  FieldArrayWithId,
  UseFieldArrayRemove,
  UseFormReturn,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type { CreateCustomIntegrationFormData } from '../model/types';
import { HTTP_HEADER_NAME_PATTERN } from '../lib/custom-config-field-validation';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { PasswordInput } from '@ayunis/ui/components/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';

interface CustomConfigFieldEditorProps {
  form: UseFormReturn<CreateCustomIntegrationFormData>;
  fields: FieldArrayWithId<CreateCustomIntegrationFormData, 'fields', 'id'>[];
  remove: UseFieldArrayRemove;
  disabled: boolean;
}

export function CustomConfigFieldEditor({
  form,
  fields,
  remove,
  disabled,
}: Readonly<CustomConfigFieldEditorProps>) {
  const { t } = useTranslation('admin-settings-integrations');

  if (fields.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        {t('integrations.createCustomDialog.noFields')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-4 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {t('integrations.createCustomDialog.fieldTitle', {
                number: index + 1,
              })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">
                {t('integrations.createCustomDialog.removeField')}
              </span>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`fields.${index}.scope`}
              render={({ field: input }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createCustomDialog.scope')}
                  </FormLabel>
                  <Select
                    value={input.value}
                    onValueChange={input.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="organization">
                        {t('integrations.createCustomDialog.scopeOrganization')}
                      </SelectItem>
                      <SelectItem value="user">
                        {t('integrations.createCustomDialog.scopeUser')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`fields.${index}.type`}
              render={({ field: input }) => (
                <FormItem>
                  <FormLabel>
                    {t('integrations.createCustomDialog.fieldType')}
                  </FormLabel>
                  <Select
                    value={input.value}
                    onValueChange={input.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="secret">
                        {t('integrations.createCustomDialog.fieldTypeSecret')}
                      </SelectItem>
                      <SelectItem value="text">
                        {t('integrations.createCustomDialog.fieldTypeText')}
                      </SelectItem>
                      <SelectItem value="url">
                        {t('integrations.createCustomDialog.fieldTypeUrl')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              form={form}
              index={index}
              name="label"
              label={t('integrations.createCustomDialog.fieldLabel')}
              required
              disabled={disabled}
            />
            <TextField
              form={form}
              index={index}
              name="headerName"
              label={t('integrations.createCustomDialog.headerName')}
              placeholder="Authorization"
              required
              disabled={disabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              form={form}
              index={index}
              name="prefix"
              label={t('integrations.createCustomDialog.prefix')}
              placeholder="Bearer "
              disabled={disabled}
            />
            <TextField
              form={form}
              index={index}
              name="help"
              label={t('integrations.createCustomDialog.help')}
              disabled={disabled}
            />
          </div>

          <FormField
            control={form.control}
            name={`fields.${index}.required`}
            render={({ field: input }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={input.value}
                    onCheckedChange={input.onChange}
                    disabled={disabled}
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  {t('integrations.createCustomDialog.required')}
                </FormLabel>
              </FormItem>
            )}
          />

          <OrganizationValueField
            form={form}
            index={index}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

function TextField({
  form,
  index,
  name,
  label,
  placeholder,
  required = false,
  disabled,
}: Readonly<{
  form: UseFormReturn<CreateCustomIntegrationFormData>;
  index: number;
  name: 'label' | 'headerName' | 'prefix' | 'help';
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled: boolean;
}>) {
  const { t } = useTranslation('admin-settings-integrations');
  const rules =
    name === 'headerName'
      ? {
          required,
          pattern: {
            value: HTTP_HEADER_NAME_PATTERN,
            message: t('integrations.createCustomDialog.headerInvalid'),
          },
        }
      : { required };

  return (
    <FormField
      control={form.control}
      name={`fields.${index}.${name}`}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} placeholder={placeholder} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function OrganizationValueField({
  form,
  index,
  disabled,
}: Readonly<{
  form: UseFormReturn<CreateCustomIntegrationFormData>;
  index: number;
  disabled: boolean;
}>) {
  const { t } = useTranslation('admin-settings-integrations');
  const scope = form.watch(`fields.${index}.scope`);
  const type = form.watch(`fields.${index}.type`);
  const required = form.watch(`fields.${index}.required`);
  if (scope !== 'organization') return null;

  return (
    <FormField
      control={form.control}
      name={`fields.${index}.value`}
      rules={{ required }}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t('integrations.createCustomDialog.organizationValue')}
          </FormLabel>
          <FormControl>
            {type === 'secret' ? (
              <PasswordInput {...field} disabled={disabled} />
            ) : (
              <Input
                {...field}
                type={type === 'url' ? 'url' : 'text'}
                disabled={disabled}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
