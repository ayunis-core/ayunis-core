type OfficeCallback<T> = (result: Office.AsyncResult<T>) => void;

export function officeAsync<T>(
  call: (callback: OfficeCallback<T>) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    call((result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        reject(new Error(result.error.message || 'Office call failed'));
        return;
      }
      resolve(result.value);
    });
  });
}

export function mailboxSupports(version: string): boolean {
  try {
    return Office.context.requirements.isSetSupported('Mailbox', version);
  } catch {
    return false;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
