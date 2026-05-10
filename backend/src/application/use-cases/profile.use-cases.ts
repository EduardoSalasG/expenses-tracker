import type { ReportFrequency } from '../../domain/types.js';
import type { UserRepository } from '../ports.js';

export class UpdateReportPreferencesUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(userId: string, preferences: ReportFrequency[]) {
    return this.users.updateReportPreferences(userId, preferences);
  }
}

export class UpdateProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(userId: string, input: { firstName: string; lastName: string; preferredName: string; email?: string; countryOfResidence: string; preferredCurrency: string }) {
    return this.users.updateProfile(userId, input);
  }
}
