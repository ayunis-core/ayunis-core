import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
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
import { useUpdateEmbeddingModel } from '../api/useUpdateEmbeddingModel';
import type { EmbeddingModelFormData } from '../model/types';
import type {
  EmbeddingModelResponseDto,
  UpdateEmbeddingModelRequestDtoProvider,
} from '@/shared/api';
import { CreateEmbeddingModelRequestDtoDimensions } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface EditEmbeddingModelDialogProps {
  model: EmbeddingModelResponseDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'synaforce', label: 'Synaforce' },
  { value: 'ayunis', label: 'Ayunis' },
];

const DIMENSIONS = [
  { value: 1024, label: '1024' },
  { value: 1536, label: '1536' },
  { value: 2560, label: '2560' },
];

export function EditEmbeddingModelDialog({
  model,
  open,
  onOpenChange,
}: EditEmbeddingModelDialogProps) {
  const { updateEmbeddingModel, isUpdating } = useUpdateEmbeddingModel(() => {
    onOpenChange(false);
  });

  const form = useForm<EmbeddingModelFormData>({
    defaultValues: {
      name: '',
      provider: 'openai' as UpdateEmbeddingModelRequestDtoProvider,
      displayName: '',
      dimensions: 1536,
      isArchived: false,
    },
  });

  // Reset form when model changes or dialog opens
  useEffect(() => {
    if (model && open) {
      // Convert dimensions to number if it's a string enum value
      let dimensions: CreateEmbeddingModelRequestDtoDimensions =
        CreateEmbeddingModelRequestDtoDimensions.NUMBER_1536;
      if (typeof model.dimensions === 'number') {
        dimensions = model.dimensions;
      } else if (typeof model.dimensions === 'string') {
        const parsed = Number(model.dimensions.split('_')[1]);
        if (!isNaN(parsed)) {
          if (
            Object.values(CreateEmbeddingModelRequestDtoDimensions).includes(
              parsed as CreateEmbeddingModelRequestDtoDimensions,
            )
          ) {
            dimensions = parsed as CreateEmbeddingModelRequestDtoDimensions;
          }
        }
      }

      form.reset({
        name: model.name,
        provider: model.provider,
        displayName: model.displayName,
        dimensions: dimensions,
        isArchived: model.isArchived,
      });
    }
  }, [model, open, form]);

  const handleSubmit = (data: EmbeddingModelFormData) => {
    if (!model) return;
    updateEmbeddingModel(model.id, data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUpdating) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  // Important: Dialog must always be rendered (not conditionally returned) so it receives
  // the open={false} transition. Without this, Radix UI won't clean up its Portal and
  // overlay, leaving an invisible layer that blocks all pointer events.
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {model && (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Embedding Model</DialogTitle>
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
                        placeholder="e.g., text-embedding-3-small"
                        disabled={isUpdating}
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
                      value={field.value}
                      disabled={isUpdating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVIDERS.map((provider) => (
                          <SelectItem
                            key={provider.value}
                            value={provider.value}
                          >
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
                        placeholder="e.g., Text Embedding 3 Small"
                        disabled={isUpdating}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dimensions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensions</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={String(field.value)}
                      disabled={isUpdating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dimensions" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DIMENSIONS.map((dim) => (
                          <SelectItem key={dim.value} value={String(dim.value)}>
                            {dim.label}
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
                name="isArchived"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isUpdating}
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
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      )}
    </Dialog>
  );
}
