import type { Meta, StoryObj } from '@storybook/react-vite';

import { Slider } from './slider';

const meta = {
  title: 'Components/Slider',
  component: Slider,
  args: { defaultValue: [40], max: 100, step: 1, className: 'w-72' },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Range: Story = { args: { defaultValue: [25, 75] } };
