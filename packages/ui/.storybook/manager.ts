import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

const ayunisTheme = create({
  base: 'light',
  brandTitle: 'Ayunis Core UI',
  brandUrl: '/',
  brandImage: '/brand/brand-full-light.svg',
  brandTarget: '_self',
  colorPrimary: '#8178c3',
  colorSecondary: '#6e63b6',
  appBg: '#f7f7fa',
  appContentBg: '#ffffff',
  appPreviewBg: '#f7f7fa',
  appBorderColor: '#e4e2eb',
  appBorderRadius: 8,
  fontBase: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontCode: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  textColor: '#24212d',
  textInverseColor: '#ffffff',
  textMutedColor: '#6f6b78',
  barTextColor: '#5f5b68',
  barSelectedColor: '#8178c3',
  barHoverColor: '#6e63b6',
  barBg: '#ffffff',
  buttonBg: '#ffffff',
  buttonBorder: '#dedce5',
  booleanBg: '#dedce5',
  booleanSelectedBg: '#8178c3',
  inputBg: '#ffffff',
  inputBorder: '#d6d3de',
  inputTextColor: '#24212d',
  inputBorderRadius: 6,
});

addons.setConfig({ theme: ayunisTheme });
