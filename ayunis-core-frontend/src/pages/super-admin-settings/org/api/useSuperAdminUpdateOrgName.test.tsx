import { AxiosError, AxiosHeaders } from 'axios';
import { act, renderHook } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateOrgNameFormData } from '@/pages/super-admin-settings/org/model/types';
import useSuperAdminUpdateOrgName from './useSuperAdminUpdateOrgName';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  invalidateRouter: vi.fn(),
  mutate: vi.fn(),
  mutationOptions: undefined as
    { onSuccess: () => void; onError: (error: unknown) => void } | undefined,
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidateRouter }),
}));
vi.mock('@/shared/api', () => ({
  getSuperAdminOrgsControllerGetAllOrgsQueryKey: () => ['orgs'],
  getSuperAdminOrgsControllerGetOrgByIdQueryKey: (id: string) => ['org', id],
  useSuperAdminOrgsControllerUpdateOrg: (options: {
    mutation: { onSuccess: () => void; onError: (error: unknown) => void };
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate, isPending: false };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
// Only the validation key is "translated" so setValidationErrors resolves the
// specific constraint key instead of falling back to the generic one.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'orgDetails.validation.name.isNotEmpty'
        ? 'Name is required'
        : key,
  }),
}));

const ORG_ID = '11111111-1111-1111-1111-111111111111';

function errorWithBody(body: unknown) {
  return new AxiosError('failed', undefined, undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: body,
  });
}

function renderUpdateOrgName() {
  const setError = vi.fn();
  const onSuccess = vi.fn();
  const form = { setError } as unknown as UseFormReturn<UpdateOrgNameFormData>;
  const { result } = renderHook(() =>
    useSuperAdminUpdateOrgName({ orgId: ORG_ID, form, onSuccess }),
  );
  return { result, setError, onSuccess };
}

describe('useSuperAdminUpdateOrgName', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the new name to the org update endpoint', () => {
    const { result } = renderUpdateOrgName();

    act(() => result.current.updateOrgName({ name: 'Renamed Corporation' }));

    expect(mocks.mutate).toHaveBeenCalledWith({
      id: ORG_ID,
      data: { name: 'Renamed Corporation' },
    });
  });

  it('refreshes the org detail and org list after renaming', () => {
    const { onSuccess } = renderUpdateOrgName();

    act(() => mocks.mutationOptions?.onSuccess());

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['org', ORG_ID],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['orgs'],
    });
    expect(mocks.invalidateRouter).toHaveBeenCalledOnce();
    expect(mocks.showSuccess).toHaveBeenCalledWith('orgDetails.rename.success');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('shows backend validation errors on the name field', () => {
    const { setError } = renderUpdateOrgName();

    act(() =>
      mocks.mutationOptions?.onError(
        errorWithBody({
          code: 'VALIDATION_ERROR',
          errors: [{ field: 'name', constraints: ['isNotEmpty'] }],
        }),
      ),
    );

    expect(setError).toHaveBeenCalledWith('name', {
      message: 'Name is required',
    });
    expect(mocks.showError).not.toHaveBeenCalled();
  });

  it.each([
    ['ORG_NOT_FOUND', 'orgDetails.rename.errorNotFound'],
    ['ORG_UPDATE_FAILED', 'orgDetails.rename.errorRejected'],
    ['SOMETHING_ELSE', 'orgDetails.rename.error'],
  ])('reports %s as a toast', (code, expectedMessage) => {
    renderUpdateOrgName();

    act(() => mocks.mutationOptions?.onError(errorWithBody({ code })));

    expect(mocks.showError).toHaveBeenCalledWith(expectedMessage);
  });

  it('falls back to a generic toast for non-Axios failures', () => {
    renderUpdateOrgName();

    act(() => mocks.mutationOptions?.onError(new Error('offline')));

    expect(mocks.showError).toHaveBeenCalledWith('orgDetails.rename.error');
  });
});
