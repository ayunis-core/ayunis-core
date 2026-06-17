import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/shadcn/input-group';

function PasswordInput({
  className,
  disabled,
  ...props
}: React.ComponentProps<'input'>): React.ReactElement {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <InputGroup data-disabled={disabled || undefined} className={className}>
      <InputGroupInput
        {...props}
        type={showPassword ? 'text' : 'password'}
        disabled={disabled}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput };
