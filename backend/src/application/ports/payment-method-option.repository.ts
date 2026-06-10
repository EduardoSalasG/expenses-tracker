import type { PaymentMethodOption, TenantId } from '../../domain/index.js';

export interface PaymentMethodOptionRepository {
  listByTenant(tenantId: TenantId): Promise<PaymentMethodOption[]>;
  findAccessibleById(tenantId: TenantId, paymentMethodOptionId: string): Promise<PaymentMethodOption | undefined>;
  create(input: Omit<PaymentMethodOption, 'id'>): Promise<PaymentMethodOption>;
}
