import { useConfirmationContext } from "./ConfirmationProvider";
import type { ConfirmationOptions } from "./types";

export function useConfirmation() {
  const { showConfirmation } = useConfirmationContext();

  const confirm = (options: ConfirmationOptions) => {
    showConfirmation(options);
  };

  return { confirm };
}
