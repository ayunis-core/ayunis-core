import {
  useRef,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@ayunis/ui/components/input';
import { cn } from '@ayunis/ui/lib/cn';

const NATIVE_SEARCH_CANCEL_HIDDEN =
  '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none';

type SearchFieldProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange'
> & {
  ref?: Ref<HTMLInputElement>;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  wrapperClassName?: string;
  leadingIcon?: boolean;
  iconClassName?: string;
  'data-testid'?: string;
};

function clearedChange(): ChangeEvent<HTMLInputElement> {
  return {
    target: { value: '' },
    currentTarget: { value: '' },
  } as ChangeEvent<HTMLInputElement>;
}

function assignInputRef(
  ref: Ref<HTMLInputElement> | undefined,
  node: HTMLInputElement | null,
) {
  if (typeof ref === 'function') {
    ref(node);
    return;
  }
  if (ref) {
    ref.current = node;
  }
}

export function SearchField({
  ref,
  value,
  onChange,
  onKeyDown,
  className,
  wrapperClassName,
  leadingIcon = false,
  iconClassName,
  disabled,
  'data-testid': dataTestId,
  ...props
}: SearchFieldProps) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasText = value.length > 0;

  const clear = () => {
    onChange(clearedChange());
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (
      event.key !== 'Escape' ||
      !hasText ||
      disabled ||
      event.defaultPrevented
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    clear();
  };

  return (
    <div className={cn('relative', wrapperClassName)}>
      {leadingIcon && (
        <Search
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground',
            iconClassName,
          )}
        />
      )}
      <Input
        {...props}
        ref={(node) => {
          inputRef.current = node;
          assignInputRef(ref, node);
        }}
        type="search"
        disabled={disabled}
        data-testid={dataTestId}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className={cn(
          NATIVE_SEARCH_CANCEL_HIDDEN,
          hasText && 'pr-8',
          className,
        )}
      />
      {hasText && (
        <button
          type="button"
          aria-label={t('common.search.clear')}
          disabled={disabled}
          data-testid={dataTestId ? `${dataTestId}-clear` : undefined}
          className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clear}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  );
}
