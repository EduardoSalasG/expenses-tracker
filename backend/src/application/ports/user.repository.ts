import type { ReportFrequency, User } from '../../domain/index.js';

export interface UserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  findById(userId: string): Promise<User | undefined>;
  listByReportFrequency(frequency: ReportFrequency): Promise<User[]>;
  upsertByPhoneNumber(input: Omit<User, 'id' | 'tenantId' | 'role' | 'reportPreferences'>): Promise<User>;
  updateProfile(userId: string, input: Pick<User, 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency'>): Promise<User>;
  updateReportPreferences(userId: string, preferences: ReportFrequency[]): Promise<User>;
}
