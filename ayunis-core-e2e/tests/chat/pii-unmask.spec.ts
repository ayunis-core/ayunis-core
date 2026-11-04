import { test, expect } from '../../src/fixtures/test';
import { getThread } from '../../src/clients/api/threads.client';
import { sendMessage } from '../../src/flows/chat.flow';

// Manual unmasking (AYC-807): in an anonymous chat a detected PII value is
// rendered as a clickable masked term; after confirming, the term is
// permanently unmasked for this thread and is no longer masked in follow-up
// messages. Requires the anonymisation service, which the CI stack does not
// run — start the stack with `./dev up --e2e --with-anonymisation` and run
// with E2E_WITH_ANONYMISATION=true.
test.describe('PII mask manual unmasking', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- environment gate, not a disabled test: the CI stack runs without the anonymisation service
  test.skip(
    process.env.E2E_WITH_ANONYMISATION !== 'true',
    'requires the anonymisation service (E2E_WITH_ANONYMISATION=true against a --with-anonymisation stack)',
  );

  test('unmasks a term for the thread after confirmation', async ({
    page,
  }) => {
    const email = `max.${Date.now()}@example.com`;

    await page.goto('/chat');
    await page.getByTestId('chat-anonymous-toggle').click();
    await sendMessage(page, `Meine E-Mail ist ${email}`);
    await expect(page.getByTestId('assistant-message').last()).toBeVisible();

    // The detected address renders highlighted and clickable.
    const mask = page.getByTestId('pii-mask').filter({ hasText: email });
    await expect(mask).toBeVisible();

    // Cancelling the confirmation keeps the mask.
    await mask.click();
    await page.getByTestId('confirmation-cancel').click();
    await expect(mask).toBeVisible();

    // Confirming unmasks: the term renders as plain text.
    await mask.click();
    await page.getByTestId('confirmation-confirm').click();
    await expect(
      page.getByTestId('pii-mask-unmasked').filter({ hasText: email }),
    ).toBeVisible();
    await expect(mask).toHaveCount(0);

    // A follow-up message containing the term is no longer masked.
    await sendMessage(page, `Bitte antworte an ${email}`);
    await expect(page.getByTestId('user-message').last()).toContainText(email);
    await expect(mask).toHaveCount(0);

    // Survives a reload — the unmask is persisted on the thread.
    await page.reload();
    await expect(
      page.getByTestId('pii-mask-unmasked').filter({ hasText: email }).first(),
    ).toBeVisible();
    await expect(mask).toHaveCount(0);
  });

  test('masks a personnel number as a government ID', async ({ page, api }) => {
    const personnelNumber = '23423525';
    const prompt =
      'Schreibe eine Kündigung für Martin Meier Gartenstraße 100 53721 Siegburg, geb. 12.12.1982, Personalnummer 23423525 wegen Trunkenheit am Arbeitsplatz...';

    await page.goto('/chat');
    await page.getByTestId('chat-anonymous-toggle').click();
    await sendMessage(page, prompt);
    await expect(page.getByTestId('assistant-message').last()).toBeVisible();

    await expect(
      page.getByTestId('pii-mask').filter({ hasText: personnelNumber }),
    ).toBeVisible();

    const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1];
    expect(threadId).toBeDefined();
    const thread = await getThread(api, threadId as string);
    expect(thread.piiMasks).toContainEqual(
      expect.objectContaining({
        value: personnelNumber,
        category: 'government_id',
      }),
    );
  });
});
