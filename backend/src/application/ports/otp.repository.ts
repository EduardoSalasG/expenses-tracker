export interface OtpRepository {
  create(phoneNumber: string, code: string, expiresAt: Date): Promise<void>;
  verify(phoneNumber: string, code: string, now: Date): Promise<boolean>;
}
