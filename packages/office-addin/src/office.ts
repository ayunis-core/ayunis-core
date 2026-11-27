const OFFICE_READY_TIMEOUT_MS = 15_000;

export function officeReady(): Promise<void> {
  if (typeof Office === 'undefined') {
    return Promise.reject(new Error('Office.js is not loaded'));
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Office.js did not become ready')),
      OFFICE_READY_TIMEOUT_MS,
    );
    void Office.onReady().then(() => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

function officeContext(): Partial<Office.Context> | undefined {
  if (typeof Office === 'undefined') return undefined;
  try {
    return Office.context;
  } catch {
    return undefined;
  }
}

export function officeUi(): Partial<Office.UI> | undefined {
  return officeContext()?.ui;
}

export function officeDisplayLanguage(): string {
  return officeContext()?.displayLanguage ?? navigator.language;
}

export function officeDialogAvailable(): Promise<boolean> {
  return officeReady().then(
    () => typeof officeUi()?.displayDialogAsync === 'function',
    () => false,
  );
}
