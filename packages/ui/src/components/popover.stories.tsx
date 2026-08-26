import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta = { title: 'Components/Popover', component: Popover } satisfies Meta<
  typeof Popover
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Set dimensions</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div>
            <strong>Dimensions</strong>
            <p className="text-muted-foreground text-sm">
              Set the desired size.
            </p>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="width">Width</Label>
            <Input id="width" defaultValue="100%" className="col-span-2" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
