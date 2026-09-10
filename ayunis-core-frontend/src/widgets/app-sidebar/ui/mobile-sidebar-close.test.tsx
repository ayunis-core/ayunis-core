import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPortal } from 'react-dom';
import {
  Sidebar,
  SidebarProvider,
  useSidebar,
} from '@ayunis/ui/components/sidebar';
import { useMobileSidebarNavigationHandler } from '@/widgets/app-sidebar/hooks/useMobileSidebarNavigationHandler';

function OpenSidebarButton() {
  const { setOpenMobile } = useSidebar();
  return <button onClick={() => setOpenMobile(true)}>open sidebar</button>;
}

function MobileSidebar({ children }: Readonly<{ children: React.ReactNode }>) {
  const handleMobileNavigation = useMobileSidebarNavigationHandler();
  return <Sidebar onClickCapture={handleMobileNavigation}>{children}</Sidebar>;
}

function renderMobileSidebar(link: React.ReactNode) {
  render(
    <SidebarProvider pathname="/chat">
      <OpenSidebarButton />
      <MobileSidebar>{link}</MobileSidebar>
    </SidebarProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'open sidebar' }));
}

beforeEach(() => {
  vi.useFakeTimers();
  window.innerWidth = 375;
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('mobile sidebar', () => {
  it('closes when a link is clicked, even if it points at the current route', () => {
    renderMobileSidebar(<a href="/chat">New chat</a>);

    fireEvent.click(screen.getByRole('link', { name: 'New chat' }));

    expect(screen.queryByRole('link', { name: 'New chat' })).toBeNull();
  });

  it('closes even when the link stops propagation, without swallowing its handler', () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.stopPropagation());
    renderMobileSidebar(
      <a href="/chats" onClick={onClick}>
        Search chats
      </a>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Search chats' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', { name: 'Search chats' })).toBeNull();
  });

  it('closes for links rendered through a menu portal', () => {
    renderMobileSidebar(
      createPortal(
        <a href="/settings/general">Account settings</a>,
        document.body,
      ),
    );

    const portalLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/settings/general"]',
    );
    expect(portalLink).not.toBeNull();
    fireEvent.click(portalLink!);

    expect(screen.queryByRole('link', { name: 'Account settings' })).toBeNull();
  });

  it('stays open when a control nested inside a link is clicked', () => {
    renderMobileSidebar(
      <a href="/getting-started">
        Getting started
        <button onClick={(event) => event.preventDefault()}>dismiss</button>
      </a>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));

    expect(
      screen.queryByRole('link', { name: /Getting started/ }),
    ).not.toBeNull();
  });

  it('does not remove the overlay when the sidebar is reopened', () => {
    renderMobileSidebar(<a href="/chat">New chat</a>);

    fireEvent.click(screen.getByRole('link', { name: 'New chat' }));
    fireEvent.click(screen.getByRole('button', { name: 'open sidebar' }));
    act(() => vi.advanceTimersByTime(400));

    expect(
      document.querySelector('[data-slot="sheet-overlay"]'),
    ).not.toBeNull();
  });
});
