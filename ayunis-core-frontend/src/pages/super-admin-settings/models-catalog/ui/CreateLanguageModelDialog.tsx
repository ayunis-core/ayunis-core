import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/shared/ui/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { useCreateLanguageModel } from '../api/useCreateLanguageModel';
import type { LanguageModelFormData } from '../model/types';
import type { CreateLanguageModelRequestDtoProvider } from '@/shared/api';
import { LANGUAGE_MODEL_PROVIDERS } from '@/features/models';

interface CreateLanguageModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLanguageModelDialog({
  open,
  onOpenChange,
}: CreateLanguageModelDialogProps) {
  const form = useForm<LanguageModelFormData>({
    defaultValues: {
      name: '',
      provider: 'openai' as CreateLanguageModelRequestDtoProvider,
      displayName: '',
      canStream: false,
      canUseTools: false,
      canVision: false,
      isReasoning: false,
      isArchived: false,
    },
  });

  const { createLanguageModel, isCreating } = useCreateLanguageModel(() => {
    onOpenChange(false);
    form.reset();
  });

  const handleSubmit = (data: LanguageModelFormData) => {
    createLanguageModel(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isCreating) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Language Model</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., gpt-4"
                      disabled={isCreating}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGE_MODEL_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., GPT-4"
                      disabled={isCreating}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canStream"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Supports Streaming</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canUseTools"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Supports Tool Use</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canVision"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Supports Vision</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isReasoning"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Has Reasoning Capabilities</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isArchived"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Archived</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
