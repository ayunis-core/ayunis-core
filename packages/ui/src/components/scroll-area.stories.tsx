import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScrollArea } from './scroll-area';
import { Separator } from './separator';

const meta = {
  title: 'Components/ScrollArea',
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-64 w-72 rounded-md border p-4">
      {Array.from({ length: 20 }, (_, index) => (
        <div key={index}>
          <div className="py-2 text-sm">Scrollable item {index + 1}</div>
          {index < 19 && <Separator />}
        </div>
      ))}
    </ScrollArea>
  ),
};
