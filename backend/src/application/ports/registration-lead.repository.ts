import type { LanguageCode, RegistrationLead } from '../../domain/index.js';

export interface RegistrationLeadRepository {
  upsertStarted(input: {
    firstName: string;
    email: string;
    preferredLanguage?: LanguageCode;
    phoneNumber?: string;
  }): Promise<RegistrationLead>;
  markCompletedByEmail(email: string, phoneNumber?: string): Promise<void>;
}
