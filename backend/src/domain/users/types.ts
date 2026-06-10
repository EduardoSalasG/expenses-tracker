import type { CurrencyCode, ReportFrequency } from '../finance/index.js';
import type { TenantId } from '../tenancy/index.js';

export type UserId = string;
export type LanguageCode = 'es' | 'en';
export type RegistrationLeadStatus = 'started' | 'completed';

export interface User {
  id: UserId;
  tenantId: TenantId;
  email?: string;
  phoneNumber: string;
  telegramChatId?: string;
  telegramUsername?: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  role: 'consumer' | 'admin';
  countryOfResidence: string;
  preferredCurrency: CurrencyCode;
  preferredLanguage?: LanguageCode;
  reportPreferences: ReportFrequency[];
}

export interface UserAuthRecord {
  user: User;
  passwordHash?: string;
}

export interface RegistrationLead {
  id: string;
  firstName: string;
  email: string;
  preferredLanguage: LanguageCode;
  phoneNumber?: string;
  status: RegistrationLeadStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
