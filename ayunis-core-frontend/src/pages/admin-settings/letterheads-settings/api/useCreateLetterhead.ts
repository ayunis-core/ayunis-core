import { useQueryClient, useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { getLetterheadsControllerFindAllQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { customAxiosInstance } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PageMargins } from '../model/types';

interface CreateLetterheadParams {
  name: string;
  description?: string;
  firstPagePdf: File;
  continuationPagePdf?: File;
  firstPageMargins: PageMargins;
  continuationPageMargins: PageMargins;
}

export function useCreateLetterhead(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-letterheads');

  const mutation = useMutation({
    mutationFn: (params: CreateLetterheadParams) => {
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
      onSuccess?.();
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

  return {
    createLetterhead: (params: CreateLetterheadParams) =>
      mutation.mutate(params),
    isCreating: mutation.isPending,
  };
}
