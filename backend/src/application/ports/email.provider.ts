export interface EmailProvider {
  send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}
