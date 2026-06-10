import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/twUtils';

const cardVariants = cva('bg-card text-card-foreground flex flex-col gap-6', {
  variants: {
    variant: {
      default:
        'overflow-hidden rounded-xl border py-6 shadow-sm has-[>[data-slot=card-image]:first-child]:pt-0',
      plain: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type CardProps<C extends React.ElementType = 'div'> = {
  as?: C;
} & VariantProps<typeof cardVariants> &
  Omit<React.ComponentProps<C>, 'as'>;

function Card<C extends React.ElementType = 'div'>({
  className,
  variant,
  as,
  ...props
}: CardProps<C>): React.ReactElement {
  const Comp = as ?? 'div';
  return (
    <Comp
      data-slot="card"
      data-variant={variant ?? 'default'}
      className={cn(cardVariants({ variant }), 'group/card', className)}
      {...props}
    />
  );
}

function CardImage({
  className,
  alt,
  src,
  ...props
}: React.ComponentProps<'img'>): React.ReactElement {
  const hasImage = !!src;

  return (
    <div
      data-slot="card-image"
      className={cn(
        'overflow-hidden group-data-[variant=plain]/card:rounded-xl',
        className,
      )}
    >
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover group-data-[variant=plain]/card:rounded-xl"
          {...props}
        />
      ) : (
        <div
          role="img"
          aria-label={alt ?? ''}
          className="flex aspect-video w-full items-center justify-center bg-muted group-data-[variant=plain]/card:rounded-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-8 text-muted-foreground/40"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      )}
    </div>
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 group-data-[variant=plain]/card:px-0',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6 group-data-[variant=plain]/card:px-0', className)}
      {...props}
    />
  );
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center px-6 [.border-t]:pt-6 group-data-[variant=plain]/card:px-0',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardImage,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
