import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronsUpDownIcon } from 'lucide-react';

import { Button } from './button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';

const meta = {
  title: 'Components/Collapsible',
  component: Collapsible,
} satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-80 space-y-2">
      <div className="flex items-center justify-between">
        <strong>Three resources</strong>
        <CollapsibleTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Toggle resources">
            <ChevronsUpDownIcon />
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-2 text-sm">Public resource</div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-2 text-sm">
          Additional resource
        </div>
        <div className="rounded-md border px-4 py-2 text-sm">
          Archived resource
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};
