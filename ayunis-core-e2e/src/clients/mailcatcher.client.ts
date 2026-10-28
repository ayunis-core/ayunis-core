import type { APIRequestContext } from '@playwright/test';

export interface MailMessage {
  id: number;
  sender: string;
  recipients: string[];
  subject: string;
  created_at: string;
}

export class MailcatcherClient {
  constructor(
    private readonly api: APIRequestContext,
    private readonly baseURL: string,
  ) {}

  async messages(): Promise<MailMessage[]> {
    const res = await this.api.get(`${this.baseURL}/messages`);
    if (!res.ok()) {
      throw new Error(
        `Mailcatcher not reachable at ${this.baseURL} (HTTP ${res.status()}). Is the dev stack up?`,
      );
    }
    return (await res.json()) as MailMessage[];
  }

  async waitForMessage(
    recipient: string,
    opts: { timeoutMs?: number } = {},
  ): Promise<MailMessage> {
    const timeoutMs = opts.timeoutMs ?? 15_000;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const match = (await this.messages())
        .filter((m) => m.recipients.some((r) => r.includes(recipient)))
        .at(-1);
      if (match) return match;
      if (Date.now() > deadline) {
        throw new Error(
          `No email for ${recipient} arrived within ${timeoutMs}ms`,
        );
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  async html(id: number): Promise<string> {
    const res = await this.api.get(`${this.baseURL}/messages/${id}.html`);
    return res.text();
  }

  async extractLinkToken(
    recipient: string,
    linkPath: string,
    opts: { timeoutMs?: number } = {},
  ): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? 15_000;
    const deadline = Date.now() + timeoutMs;
    const pattern = new RegExp(
      `${linkPath.replace(/[/\\.]/g, '\\$&')}\\?token=([A-Za-z0-9._-]+)`,
    );
    for (;;) {
      const candidates = (await this.messages())
        .filter((m) => m.recipients.some((r) => r.includes(recipient)))
        .reverse();
      for (const message of candidates) {
        const match = pattern.exec(await this.html(message.id));
        if (match) return match[1];
      }
      if (Date.now() > deadline) {
        throw new Error(
          `No email to ${recipient} with a ${linkPath}?token=… link arrived within ${timeoutMs}ms (${candidates.length} emails checked)`,
        );
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}
