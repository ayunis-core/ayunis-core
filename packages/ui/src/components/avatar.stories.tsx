import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from './avatar';

const meta = { title: 'Components/Avatar', component: Avatar } satisfies Meta<
  typeof Avatar
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AL</AvatarFallback>
      <AvatarBadge />
    </Avatar>
  ),
};
export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {['AL', 'GH', 'AT'].map((initials) => (
        <Avatar key={initials}>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+4</AvatarGroupCount>
    </AvatarGroup>
  ),
};
