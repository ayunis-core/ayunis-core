import { z } from 'zod';

const officeDialogMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session'),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresIn: z.number(),
  }),
  z.object({ type: z.literal('error'), code: z.string() }),
]);

export type OfficeDialogMessage = z.infer<typeof officeDialogMessageSchema>;

export function parseOfficeDialogMessage(
  raw: string,
): OfficeDialogMessage | null {
  try {
    const result = officeDialogMessageSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
