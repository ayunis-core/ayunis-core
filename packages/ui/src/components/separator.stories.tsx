import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from './separator';

const meta = {
  title: 'Components/Separator',
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-72">
      <p>Above</p>
      <Separator className="my-4" />
      <p>Below</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className="flex h-6 items-center gap-4">
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
  ),
};
