import type { Meta, StoryObj } from '@storybook/react-vite';
import { InboxIcon } from 'lucide-react';

import { Button } from './button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty';

const meta = { title: 'Components/Empty', component: Empty } satisfies Meta<
  typeof Empty
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty className="w-96">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>No results</EmptyTitle>
        <EmptyDescription>
          Try changing your filters or create a new item.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create item</Button>
      </EmptyContent>
    </Empty>
  ),
};
