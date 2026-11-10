import { z } from 'zod';
import { SessionHandoffRequestDtoClient } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const OUTLOOK_CLIENT = SessionHandoffRequestDtoClient.outlook;

const dialogMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session'),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresIn: z.number(),
  }),
  z.object({ type: z.literal('error'), code: z.string() }),
]);

/** What the sign-in dialog sends to the pane through `messageParent`. */
export type DialogMessage = z.infer<typeof dialogMessageSchema>;

export function parseDialogMessage(raw: string): DialogMessage | null {
  try {
    const result = dialogMessageSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
