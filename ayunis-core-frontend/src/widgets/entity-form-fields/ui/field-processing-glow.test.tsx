import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { Form } from '@ayunis/ui/components/form';
import ShortDescriptionField from './ShortDescriptionField';
import InstructionsField from './InstructionsField';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function Harness({ isBusy }: Readonly<{ isBusy: boolean }>) {
  const form = useForm({
    defaultValues: { shortDescription: '', instructions: '' },
  });
  return (
    <Form {...form}>
      <ShortDescriptionField
        control={form.control}
        name="shortDescription"
        translationNamespace="skills"
        isBusy={isBusy}
      />
      <InstructionsField
        control={form.control}
        name="instructions"
        translationNamespace="skills"
        isBusy={isBusy}
      />
    </Form>
  );
}

describe('field processing glow', () => {
  afterEach(cleanup);

  it('lights both fields while they are being rewritten', () => {
    const { container } = render(<Harness isBusy />);

    expect(container.querySelectorAll('.processing-glow--active')).toHaveLength(
      2,
    );
  });

  it('leaves both fields alone otherwise', () => {
    const { container } = render(<Harness isBusy={false} />);

    expect(container.querySelectorAll('.processing-glow--active')).toHaveLength(
      0,
    );
    expect(container.querySelectorAll('.processing-glow')).toHaveLength(2);
  });
});
