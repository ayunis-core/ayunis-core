import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@ayunis/ui/components/sidebar';
import { SidebarCollapsibleGroup } from './SidebarCollapsibleGroup';

function renderGroup(action?: React.ReactNode) {
  render(
    <SidebarProvider>
      <SidebarCollapsibleGroup
        label="Arbeitsbereiche"
        storageKey="sidebar_test_open"
        action={action}
        testId="sidebar-test-group"
      >
        <span>Bürgeranfragen</span>
      </SidebarCollapsibleGroup>
    </SidebarProvider>,
  );
}

describe('SidebarCollapsibleGroup', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(cleanup);

  it('collapses and expands its content from the group label', () => {
    renderGroup();
    const trigger = screen.getByRole('button', { name: /Arbeitsbereiche/ });

    expect(screen.getByText('Bürgeranfragen')).toBeTruthy();

    fireEvent.click(trigger);
    expect(screen.queryByText('Bürgeranfragen')).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByText('Bürgeranfragen')).toBeTruthy();
  });

  it('remembers a collapsed group across mounts', () => {
    renderGroup();

    fireEvent.click(screen.getByRole('button', { name: /Arbeitsbereiche/ }));
    expect(window.localStorage.getItem('sidebar_test_open')).toBe('false');

    cleanup();
    renderGroup();

    expect(screen.queryByText('Bürgeranfragen')).toBeNull();
  });

  it('keeps the action out of the toggle', () => {
    const onAction = vi.fn();
    renderGroup(
      <button
        onClick={(event) => {
          event.stopPropagation();
          onAction();
        }}
      >
        Suche
      </button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suche' }));

    expect(onAction).toHaveBeenCalled();
    expect(screen.getByText('Bürgeranfragen')).toBeTruthy();
  });
});
