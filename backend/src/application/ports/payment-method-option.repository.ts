import type { PaymentMethodOption, TenantId } from '../../domain/index.js';

export interface PaymentMethodOptionRepository {
  listByTenant(tenantId: TenantId, financialAccountId?: string): Promise<PaymentMethodOption[]>;
  findAccessibleById(tenantId: TenantId, paymentMethodOptionId: string, financialAccountId?: string): Promise<PaymentMethodOption | undefined>;
  create(input: Omit<PaymentMethodOption, 'id'>): Promise<PaymentMethodOption>;
  update(input: {
    tenantId: TenantId;
    paymentMethodOptionId: string;
    code: string;
    name: string;
    kind: PaymentMethodOption['kind'];
    cardType?: PaymentMethodOption['cardType'];
  }): Promise<PaymentMethodOption | undefined>;
  delete(input: { tenantId: TenantId; paymentMethodOptionId: string }): Promise<boolean>;
}
