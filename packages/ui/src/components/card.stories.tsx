import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardImage,
  CardTitle,
} from './card';

const meta = { title: 'Components/Card', component: Card } satisfies Meta<
  typeof Card
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardImage alt="Placeholder illustration" />
      <CardHeader>
        <CardTitle>Project overview</CardTitle>
        <CardDescription>
          A concise description of the card content.
        </CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost">
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        Card content can contain any application-independent composition.
      </CardContent>
      <CardFooter>
        <Button>Continue</Button>
      </CardFooter>
    </Card>
  ),
};
