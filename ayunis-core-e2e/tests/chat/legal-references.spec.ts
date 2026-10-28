import { test, expect } from '../../src/fixtures/test';
import { startThread } from '../../src/flows/chat.flow';

test.describe('legal references in assistant messages', () => {
  test('renders a federal section and paragraph as an external link', async ({
    page,
  }) => {
    await startThread(page, 'Name this chat {{legal:DE/BGB/sec_433/par_2}}');

    const assistantMessage = page.getByTestId('assistant-message').last();
    const legalReference = assistantMessage.getByRole('link');

    await expect(legalReference).toHaveText('§ 433 Abs. 2 BGB');
    await expect(legalReference).toHaveAttribute(
      'href',
      'https://bundesrecht.online/BGB/433#Abs2',
    );
    await expect(legalReference).toHaveAttribute('target', '_blank');
    await expect(legalReference).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });

  test('renders a state article as an external link', async ({ page }) => {
    await startThread(page, 'Name this chat {{legal:DE-BY/POG/art_1}}');

    const assistantMessage = page.getByTestId('assistant-message').last();
    const legalReference = assistantMessage.getByRole('link');

    await expect(legalReference).toHaveText('Art. 1 POG');
    await expect(legalReference).toHaveAttribute(
      'href',
      'https://landesrecht.online/BY/POG/1',
    );
    await expect(legalReference).toHaveAttribute('target', '_blank');
    await expect(legalReference).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
});
