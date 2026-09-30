import type { Locator } from '@playwright/test';
import type { ReindexIntervalUnit } from '../clients/generated/ayunisCoreAPI.schemas';

/** Sets the interval fields of a dialog whose automatic re-indexing is on. */
export async function setReindexInterval(
  dialog: Locator,
  value: number,
  unit: ReindexIntervalUnit,
): Promise<void> {
  await dialog.getByTestId('reindex-interval-value').fill(String(value));
  await dialog.getByTestId('reindex-interval-unit').click();
  await dialog.page().getByTestId(`reindex-interval-unit-${unit}`).click();
}
