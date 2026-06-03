import type { ReportFrequency, User, UserAuthRecord } from '../../domain/index.js';

export interface UserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  findAuthByPhoneNumber(phoneNumber: string): Promise<UserAuthRecord | undefined>;
  findByTelegramChatId(chatId: string): Promise<User | undefined>;
  findById(userId: string): Promise<User | undefined>;
  listByReportFrequency(frequency: ReportFrequency): Promise<User[]>;
  linkTelegramChatByPhone(phoneNumber: string, chatId: string, username?: string): Promise<User | undefined>;
  upsertByPhoneNumber(input: Omit<User, 'id' | 'tenantId' | 'role' | 'reportPreferences'>): Promise<User>;
  setPasswordHash(userId: string, passwordHash: string): Promise<User>;
  updateProfile(userId: string, input: Pick<User, 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency' | 'preferredLanguage'>): Promise<User>;
  updateReportPreferences(userId: string, preferences: ReportFrequency[]): Promise<User>;
}
