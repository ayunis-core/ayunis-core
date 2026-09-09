import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsFieldRow } from './SettingsFieldRow';

describe(SettingsFieldRow.name, () => {
  it('stacks label and control on narrow viewports', () => {
    render(
      <SettingsFieldRow>
        <p>Label</p>
        <button type="button">Action</button>
      </SettingsFieldRow>,
    );

    const row = screen.getByTestId('settings-field-row');
    expect(row.className).toContain('flex-col');
    expect(row.className).toContain('sm:flex-row');
  });
});
