import type { CurrencyCode, ReportFrequency } from '../finance/index.js';
import type { TenantId } from '../tenancy/index.js';

export type UserId = string;

export interface User {
  id: UserId;
  tenantId: TenantId;
  email?: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  role: 'consumer' | 'admin';
  countryOfResidence: string;
  preferredCurrency: CurrencyCode;
  reportPreferences: ReportFrequency[];
}
