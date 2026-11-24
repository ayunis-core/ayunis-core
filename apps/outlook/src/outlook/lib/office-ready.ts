// Office.onReady never settles when one of Office.js's own follow-up scripts
// is blocked (OfficeDev/office-js#6040), so the pages give up after a while
// instead of spinning forever.
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

// Outside an Office client office.js still loads, but leaves the context
// empty, which its types don't express. Before Office is ready the context
// may also be missing or refuse to be read.
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

/** Waits for Office; true inside a client that can open the sign-in dialog. */
export function officeDialogAvailable(): Promise<boolean> {
  return officeReady().then(
    () => typeof officeUi()?.displayDialogAsync === 'function',
    () => false,
  );
}
