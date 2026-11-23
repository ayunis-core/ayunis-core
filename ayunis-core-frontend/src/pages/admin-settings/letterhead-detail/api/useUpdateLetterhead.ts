import { useQueryClient, useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  getLetterheadsControllerFindAllQueryKey,
  getLetterheadsControllerFindOneQueryKey,
} from '@ayunis/api-client/endpoints';
import { customAxiosInstance } from '@ayunis/api-client';
import extractErrorData from '@/shared/api/extract-error-data';
import type { LetterheadResponseDto } from '@ayunis/api-client/schemas';
import type { PageMargins } from '@/shared/lib/letterhead-margins';

import {
  appendLetterheadTypography,
  type DocumentTypography,
} from '@/shared/lib/document-typography';

interface UpdateLetterheadParams extends Partial<DocumentTypography> {
  id: string;
  name?: string;
  description?: string;
  firstPagePdf?: File;
  continuationPagePdf?: File;
  firstPageMargins?: PageMargins;
  continuationPageMargins?: PageMargins;
  removeContinuationPage?: boolean;
}

export function useUpdateLetterhead(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-letterheads');
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (params: UpdateLetterheadParams) => {
      const formData = new FormData();
      appendLetterheadTypography(formData, params);
      if (params.name !== undefined) {
        formData.append('name', params.name);
      }
      if (params.description !== undefined) {
        formData.append('description', params.description);
      }
      if (params.firstPagePdf) {
        formData.append('firstPagePdf', params.firstPagePdf);
      }
      if (params.continuationPagePdf) {
        formData.append('continuationPagePdf', params.continuationPagePdf);
      }
      if (params.firstPageMargins) {
        formData.append(
          'firstPageMargins',
          JSON.stringify(params.firstPageMargins),
        );
      }
      if (params.continuationPageMargins) {
        formData.append(
          'continuationPageMargins',
          JSON.stringify(params.continuationPageMargins),
        );
      }
      if (params.removeContinuationPage) {
        formData.append('removeContinuationPage', 'true');
      }

      return customAxiosInstance<LetterheadResponseDto>({
        url: `/letterheads/${params.id}`,
        method: 'PATCH',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: formData,
      });
    },
    onSuccess: async (data, params) => {
      queryClient.setQueryData(
        getLetterheadsControllerFindOneQueryKey(params.id),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: getLetterheadsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getLetterheadsControllerFindOneQueryKey(params.id),
      });
      await router.invalidate({ sync: true });
      showSuccess(t('letterheads.editDialog.success'));
      onSuccess?.();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'LETTERHEAD_PDF_NOT_SINGLE_PAGE':
            showError(t('letterheads.editDialog.pdfNotSinglePage'));
            break;
          case 'LETTERHEAD_INVALID_PDF':
            showError(t('letterheads.editDialog.invalidPdf'));
            break;
          case 'LETTERHEAD_INVALID_PAGE_MARGINS':
            showError(t('letterheads.editDialog.invalidPageMargins'));
            break;
          default:
            showError(t('letterheads.editDialog.error'));
        }
      } catch {
        showError(t('letterheads.editDialog.error'));
      }
    },
  });

  return {
    updateLetterhead: (params: UpdateLetterheadParams) =>
      mutation.mutate(params),
    isUpdating: mutation.isPending,
  };
}
