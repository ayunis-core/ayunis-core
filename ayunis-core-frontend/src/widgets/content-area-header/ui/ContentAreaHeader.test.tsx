import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContentAreaHeader from './ContentAreaHeader';

vi.mock('@ayunis/ui/components/sidebar', () => ({
  SidebarTrigger: () => <button type="button">Menu</button>,
}));

describe('ContentAreaHeader', () => {
  it('stacks header actions below the title on narrow viewports', () => {
    render(
      <ContentAreaHeader
        breadcrumbs={[{ label: 'Users' }]}
        action={<button type="button">Invite users</button>}
      />,
    );

    const header = screen.getByRole('banner');
    const actionRegion = screen.getByRole('button', {
      name: 'Invite users',
    }).parentElement;

    expect(header.className).toContain('max-sm:flex-col');
    expect(actionRegion?.className).toContain('content-area-header-actions');
    expect(actionRegion?.className).toContain('max-sm:justify-end');
  });

  it('hides the action region when its child renders nothing', () => {
    const { container } = render(
      <ContentAreaHeader
        breadcrumbs={[{ label: 'Team' }]}
        action={<>{null}</>}
      />,
    );

    const emptyActionRegion = container.querySelector(
      '.content-area-header-actions:empty',
    );

    expect(emptyActionRegion).toBeTruthy();
    expect(emptyActionRegion?.className).toContain('empty:hidden');
  });
});
