import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './skeleton';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardPlaceholder: Story = {
  render: () => (
    <div className="flex w-72 items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  ),
};
