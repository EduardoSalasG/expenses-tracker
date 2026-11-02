export interface EmailProvider {
  send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  }): Promise<void>;
}
