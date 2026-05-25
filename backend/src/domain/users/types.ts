import type { CurrencyCode, ReportFrequency } from '../finance/index.js';
import type { TenantId } from '../tenancy/index.js';

export type UserId = string;
export type LanguageCode = 'es' | 'en';

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
