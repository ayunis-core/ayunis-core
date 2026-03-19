import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import { getLetterheadsControllerFindAllQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { customAxiosInstance } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PageMargins } from '../model/types';
import { DEFAULT_MARGINS } from '../model/types';
import {
  createLetterheadFormSchema,
  type LetterheadFormValues,
} from '../model/letterheadFormSchema';

interface CreateLetterheadMutationParams {
  name: string;
  description?: string;
  firstPagePdf: File;
  continuationPagePdf?: File;
  firstPageMargins: PageMargins;
  continuationPageMargins: PageMargins;
}

interface UseCreateLetterheadOptions {
  onClose?: () => void;
}

export function useCreateLetterhead({
  onClose,
}: UseCreateLetterheadOptions = {}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-letterheads');

  const [firstPagePdf, setFirstPagePdf] = useState<File | null>(null);
  const [continuationPagePdf, setContinuationPagePdf] = useState<File | null>(
    null,
  );
  const [firstPageMargins, setFirstPageMargins] =
    useState<PageMargins>(DEFAULT_MARGINS);
  const [continuationPageMargins, setContinuationPageMargins] =
    useState<PageMargins>(DEFAULT_MARGINS);

  const form = useForm<LetterheadFormValues>({
    resolver: zodResolver(createLetterheadFormSchema(t)),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (params: CreateLetterheadMutationParams) => {
      const formData = new FormData();
      formData.append('name', params.name);
      if (params.description) {
        formData.append('description', params.description);
      }
      formData.append('firstPagePdf', params.firstPagePdf);
      if (params.continuationPagePdf) {
        formData.append('continuationPagePdf', params.continuationPagePdf);
      }
      formData.append(
        'firstPageMargins',
        JSON.stringify(params.firstPageMargins),
      );
      formData.append(
        'continuationPageMargins',
        JSON.stringify(params.continuationPageMargins),
      );

      return customAxiosInstance<LetterheadResponseDto>({
        url: '/letterheads',
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: formData,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getLetterheadsControllerFindAllQueryKey(),
      });
      showSuccess(t('letterheads.createDialog.success'));
      onClose?.();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'LETTERHEAD_INVALID_PDF':
            showError(t('letterheads.createDialog.invalidPdf'));
            break;
          case 'LETTERHEAD_INVALID_PAGE_MARGINS':
            showError(t('letterheads.createDialog.invalidPageMargins'));
            break;
          default:
            showError(t('letterheads.createDialog.error'));
        }
      } catch {
        showError(t('letterheads.createDialog.error'));
      }
    },
  });

  const onSubmit = (data: LetterheadFormValues) => {
    if (!firstPagePdf) return;
    mutation.mutate({
      name: data.name,
      description: data.description,
      firstPagePdf,
      continuationPagePdf: continuationPagePdf ?? undefined,
      firstPageMargins,
      continuationPageMargins,
    });
  };

  const resetForm = () => {
    form.reset();
    setFirstPagePdf(null);
    setContinuationPagePdf(null);
    setFirstPageMargins(DEFAULT_MARGINS);
    setContinuationPageMargins(DEFAULT_MARGINS);
  };

  return {
    form,
    onSubmit,
    resetForm,
    isLoading: mutation.isPending,
    firstPagePdf,
    setFirstPagePdf,
    continuationPagePdf,
    setContinuationPagePdf,
    firstPageMargins,
    setFirstPageMargins,
    continuationPageMargins,
    setContinuationPageMargins,
  };
}
