import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type {
  CreateRoutineDto,
  NotificationResponseDto,
  NotificationType,
  UnreadNotificationCountResponseDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

/**
 * A routine whose mock-inference run sends one notification, headlined
 * "Neue Verordnung: <subject>", and then finishes.
 */
export function notifyingRoutine(
  name: string,
  subject: string,
): CreateRoutineDto {
  return {
    name,
    prompt: `E2E notify routine: ${subject}`,
    dailyTime: '07:00',
    internetEnabled: false,
  };
}

export function listNotifications(
  api: APIRequestContext,
  type?: NotificationType,
): Promise<NotificationResponseDto[]> {
  return generatedApi
    .notificationsControllerFindAll({ limit: 100, type }, { api })
    .then((page) => page.data);
}

export function unreadNotificationCount(
  api: APIRequestContext,
): Promise<UnreadNotificationCountResponseDto> {
  return generatedApi.notificationsControllerCountUnread({ api });
}

export function getNotification(
  api: APIRequestContext,
  notificationId: string,
): Promise<NotificationResponseDto> {
  return generatedApi.notificationsControllerFindOne(notificationId, { api });
}

/** The notifications a routine posted, newest first. */
export async function notificationsOfRoutine(
  api: APIRequestContext,
  routineId: string,
): Promise<NotificationResponseDto[]> {
  return (await listNotifications(api)).filter(
    (notification) => notification.routineId === routineId,
  );
}

/** The notifications filtered by routine on the server, as the routine page lists them. */
export function listRoutineNotifications(
  api: APIRequestContext,
  routineId: string,
): Promise<NotificationResponseDto[]> {
  return generatedApi
    .notificationsControllerFindAll({ routineId, limit: 100 }, { api })
    .then((page) => page.data);
}

// Raw requests for asserting denied access; `apiURL` targets another backend
// (e.g. the one started with routines disabled).
export function requestNotifications(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/notifications`);
}

export function requestUnreadNotificationCount(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/notifications/unread-count`);
}

export function requestNotification(
  api: APIRequestContext,
  notificationId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/notifications/${notificationId}`);
}

export function requestNotificationImage(
  api: APIRequestContext,
  notificationId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/notifications/${notificationId}/image`);
}

export function requestNotificationRead(
  api: APIRequestContext,
  notificationId: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/notifications/${notificationId}/read`);
}

export function requestThreadAboutNotification(
  api: APIRequestContext,
  modelId: string,
  notificationId: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/threads`, {
    data: { modelId, sourceNotificationId: notificationId },
  });
}
