import {
  AdventCalendarDoorState,
  type AdventCalendarDoorResponseDto,
} from '@ayunis/api-client/schemas';

/** The server's door state, plus "opened" in this browser. */
export type AdventDoorDisplayState = AdventCalendarDoorState | 'opened';

export function doorDisplayState(
  door: AdventCalendarDoorResponseDto,
  isOpened: (day: number) => boolean,
): AdventDoorDisplayState {
  if (door.state === AdventCalendarDoorState.openable && isOpened(door.day)) {
    return 'opened';
  }
  return door.state;
}
