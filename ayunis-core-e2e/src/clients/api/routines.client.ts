import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type {
  CreateRoutineDto,
  RoutineResponseDto,
  GetThreadsResponseDtoItem,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

/** A routine whose mock-inference run ends at once through finish_routine. */
export function finishingRoutine(name: string): CreateRoutineDto {
  return {
    name,
    prompt: `E2E finish routine: ${name}`,
    dailyTime: '07:00',
    internetEnabled: false,
  };
}

/**
 * A routine whose mock-inference run ends with plain text, so it is nudged
 * and then fails with finish_routine_not_called. Its daily time was an hour
 * ago, so no scheduled run interferes with the test's own runs.
 */
export function failingRoutine(name: string): CreateRoutineDto {
  return {
    name,
    prompt: `Fasse das Amtsblatt zusammen: ${name}`,
    dailyTime: berlinTime(new Date(Date.now() - 60 * 60 * 1000)),
    internetEnabled: false,
  };
}

function berlinTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}

export function createRoutine(
  api: APIRequestContext,
  routine: CreateRoutineDto,
): Promise<RoutineResponseDto> {
  return generatedApi.routinesControllerCreate(routine, { api });
}

export function getRoutine(
  api: APIRequestContext,
  routineId: string,
): Promise<RoutineResponseDto> {
  return generatedApi.routinesControllerFindOne(routineId, { api });
}

export function runRoutineNow(
  api: APIRequestContext,
  routineId: string,
): Promise<void> {
  return generatedApi.routinesControllerRunNow(routineId, { api });
}

export function listRoutines(
  api: APIRequestContext,
): Promise<RoutineResponseDto[]> {
  return generatedApi.routinesControllerFindAll({ api });
}

/** The routine thread a run of the routine with this name created. */
export async function findRoutineThread(
  api: APIRequestContext,
  routineName: string,
): Promise<GetThreadsResponseDtoItem> {
  const routine = (await listRoutines(api)).find(
    (candidate) => candidate.name === routineName,
  );
  const threads = await generatedApi.threadsControllerFindAll(
    { type: 'routine' },
    { api },
  );
  const thread = threads.data.find(
    (candidate) => routine && candidate.routineId === routine.id,
  );
  if (!thread) throw new Error(`No routine thread for "${routineName}"`);
  return thread;
}

// Raw requests for asserting denied access; `apiURL` targets another backend
// (e.g. the one started with routines disabled).
export function requestRoutines(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/routines`);
}

export function requestRoutine(
  api: APIRequestContext,
  routineId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/routines/${routineId}`);
}

export function requestRoutineUpdate(
  api: APIRequestContext,
  routineId: string,
  data: Partial<CreateRoutineDto> & { enabled?: boolean },
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/routines/${routineId}`, { data });
}

export function requestRoutineDeletion(
  api: APIRequestContext,
  routineId: string,
): Promise<APIResponse> {
  return api.delete(`${config.apiURL}/api/routines/${routineId}`);
}

export function requestRoutineRun(
  api: APIRequestContext,
  routineId: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.post(`${apiURL}/api/routines/${routineId}/run`);
}

export function requestFeatureToggles(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/feature-toggles`);
}
