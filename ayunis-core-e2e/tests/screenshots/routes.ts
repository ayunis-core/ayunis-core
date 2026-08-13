import type { Page } from '@playwright/test';

export const MOBILE_ANCHOR = '[data-slot="sidebar-inset"]';

export const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 800 },
  { label: 'mobile', width: 375, height: 812 },
] as const;

export const SCREENSHOT_ROUTES = [
  { path: '/chat', name: 'chat', anchor: 'sidebar' },
  {
    path: '/admin-settings/users',
    name: 'admin-users',
    anchor: 'settings-sidebar',
  },
  {
    path: '/admin-settings/instructions',
    name: 'admin-instructions',
    anchor: 'settings-sidebar',
  },
  {
    path: '/settings/account',
    name: 'settings-account',
    anchor: 'settings-sidebar',
  },
] as const;

export type ScreenshotRoute = (typeof SCREENSHOT_ROUTES)[number];
export type ScreenshotRouteName = ScreenshotRoute['name'] | 'chat-conversation';
export type ViewportLabel = (typeof VIEWPORTS)[number]['label'];

export function routeAnchor(page: Page, route: ScreenshotRoute, viewport: ViewportLabel) {
  if (viewport === 'desktop') return page.getByTestId(route.anchor);
  return page.locator(MOBILE_ANCHOR);
}
