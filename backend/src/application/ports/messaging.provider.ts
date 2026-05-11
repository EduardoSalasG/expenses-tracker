export interface MessagingProvider {
  sendText(toPhoneNumber: string, body: string): Promise<unknown>;
}
