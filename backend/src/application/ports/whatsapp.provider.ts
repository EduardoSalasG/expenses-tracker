export interface WhatsAppProvider {
  sendText(toPhoneNumber: string, body: string): Promise<unknown>;
}
