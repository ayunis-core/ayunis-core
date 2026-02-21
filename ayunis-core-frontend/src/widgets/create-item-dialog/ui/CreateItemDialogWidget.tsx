import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
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
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { FieldValues, UseFormReturn, Path } from 'react-hook-form';

interface FormField {
  name: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  textareaProps?: {
    className?: string;
  };
}

interface CreateItemDialogWidgetProps<T extends FieldValues> {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
  title: string;
  description: string;
  form: UseFormReturn<T>;
  fields: FormField[];
  onSubmit: (data: T) => void;
  onCancel: () => void;
  isLoading: boolean;
  createButtonText: string;
  creatingButtonText: string;
  cancelButtonText: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateItemDialogWidget<T extends FieldValues>({
  buttonText,
  showIcon = false,
  buttonClassName = '',
  title,
  description,
  form,
  fields,
  onSubmit,
  onCancel,
  isLoading,
  createButtonText,
  creatingButtonText,
  cancelButtonText,
  open,
  onOpenChange,
}: Readonly<CreateItemDialogWidgetProps<T>>) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const handleCancel = () => {
    onCancel();
    setIsOpen?.(false);
  };

  const handleSubmit = (data: T) => {
    onSubmit(data);
    if (!isControlled) {
      setIsOpen?.(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(value) => setIsOpen?.(value)}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`${showIcon ? 'inline-flex items-center gap-2' : ''} ${buttonClassName}`}
        >
          {showIcon && <Plus className="h-4 w-4" />}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(handleSubmit)(e);
            }}
            className="space-y-6"
          >
            {fields.map((field) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name as Path<T>}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    <FormControl>
                      {field.type === 'input' ? (
                        <Input placeholder={field.placeholder} {...formField} />
                      ) : (
                        <Textarea
                          placeholder={field.placeholder}
                          className={field.textareaProps?.className}
                          {...formField}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {cancelButtonText}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? creatingButtonText : createButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
