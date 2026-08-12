import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';

import { Button } from './button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';

type DemoValues = { email: string };

function DemoForm() {
  const form = useForm<DemoValues>({ defaultValues: { email: '' } });
  return (
    <Form {...form}>
      <form
        className="w-80 space-y-4"
        onSubmit={(event) => {
          void form.handleSubmit(() => undefined)(event);
        }}
      >
        <FormField
          control={form.control}
          name="email"
          rules={{ required: 'Email is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.org" {...field} />
              </FormControl>
              <FormDescription>
                We use this address for notifications.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

const meta = { title: 'Components/Form' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <DemoForm /> };
