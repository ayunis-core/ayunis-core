import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchIcon } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from './input-group';

const meta = {
  title: 'Components/InputGroup',
  component: InputGroup,
} satisfies Meta<typeof InputGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Search: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>⌘K</InputGroupText>
        <InputGroupButton size="icon-xs" aria-label="Search">
          <SearchIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
