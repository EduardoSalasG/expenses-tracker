import { describe, expect, it } from 'vitest';
import { InMemoryBankOptionRepository, InMemoryPaymentMethodOptionRepository } from '../../infrastructure/repositories/in-memory.js';
import { PaymentSelectionService } from './payment-selection.service.js';

describe('PaymentSelectionService', () => {
  it('does not select an arbitrary bank when an alias matches more than one accessible option', async () => {
    const banks = new InMemoryBankOptionRepository();
    await banks.create({ tenantId: 'tenant-1', name: 'Banco de Crédito e Inversiones', isDefault: false });
    const service = new PaymentSelectionService(banks, new InMemoryPaymentMethodOptionRepository());

    await expect(service.resolve('tenant-1', undefined, {
      paymentMethod: { kind: 'card', cardType: 'credit', bank: 'bci' }
    })).resolves.toMatchObject({ bankOptionId: undefined });
  });
});
