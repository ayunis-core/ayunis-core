import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTextIcon } from 'lucide-react';

import { Button } from './button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from './item';

const meta = { title: 'Components/Item', component: Item } satisfies Meta<
  typeof Item
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
  render: () => (
    <ItemGroup className="w-96">
      {['Meeting notes', 'Project brief'].map((title, index) => (
        <div key={title}>
          <Item>
            <ItemMedia variant="icon">
              <FileTextIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription>
                Updated recently by the project team.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button size="sm" variant="outline">
                Open
              </Button>
            </ItemActions>
          </Item>
          {index === 0 && <ItemSeparator />}
        </div>
      ))}
    </ItemGroup>
  ),
};
