import type { Expense, PaymentMethod, PaymentMethodOption } from '../../domain/index.js';
import type { BankOptionRepository, PaymentMethodOptionRepository } from '../ports.js';

const EMPTY_BANK_REPOSITORY: BankOptionRepository = {
  listByTenant: async () => [],
  findAccessibleById: async () => undefined,
  create: async () => { throw new Error('Bank options repository not configured.'); },
  update: async () => undefined,
  delete: async () => false
};

const EMPTY_PAYMENT_METHOD_REPOSITORY: PaymentMethodOptionRepository = {
  listByTenant: async () => [],
  findAccessibleById: async () => undefined,
  create: async () => { throw new Error('Payment method options repository not configured.'); },
  update: async () => undefined,
  delete: async () => false
};

export class PaymentSelectionService {
  constructor(
    private readonly banks: BankOptionRepository = EMPTY_BANK_REPOSITORY,
    private readonly paymentMethods: PaymentMethodOptionRepository = EMPTY_PAYMENT_METHOD_REPOSITORY
  ) {}

  async resolve(
    tenantId: string,
    input: { paymentMethod: Expense['paymentMethod']; paymentMethodOptionId?: string; bankOptionId?: string }
  ) {
    let paymentMethod = normalizePaymentMethod(input.paymentMethod);
    let paymentMethodOptionId = input.paymentMethodOptionId;
    let bankOptionId = input.bankOptionId;

    if (paymentMethodOptionId) {
      const option = await this.paymentMethods.findAccessibleById(tenantId, paymentMethodOptionId);
      if (!option) throw new Error('Payment method option not found.');
      paymentMethod = {
        kind: option.kind,
        cardType: option.cardType,
        bank: paymentMethod.bank
      };
    } else {
      const option = await this.matchPaymentMethodOption(tenantId, paymentMethod);
      if (option) {
        paymentMethodOptionId = option.id;
        paymentMethod = {
          kind: option.kind,
          cardType: option.cardType,
          bank: paymentMethod.bank
        };
      }
    }

    if (paymentMethod.kind === 'cash') {
      return {
        paymentMethod: { kind: 'cash' } satisfies PaymentMethod,
        paymentMethodOptionId,
        bankOptionId: undefined
      };
    }

    if (bankOptionId) {
      const bank = await this.banks.findAccessibleById(tenantId, bankOptionId);
      if (!bank) throw new Error('Bank option not found.');
      paymentMethod = { ...paymentMethod, bank: bank.name };
    } else if (paymentMethod.bank) {
      const bank = await this.matchBankOption(tenantId, paymentMethod.bank);
      if (bank) {
        bankOptionId = bank.id;
        paymentMethod = { ...paymentMethod, bank: bank.name };
      }
    }

    return {
      paymentMethod,
      paymentMethodOptionId,
      bankOptionId
    };
  }

  private async matchPaymentMethodOption(tenantId: string, paymentMethod: PaymentMethod) {
    const options = await this.paymentMethods.listByTenant(tenantId);
    return options.find((option) => paymentMethodMatchesOption(paymentMethod, option));
  }

  private async matchBankOption(tenantId: string, bankName: string) {
    const normalizedInput = normalizeLookup(bankName);
    const compactInput = compactLookup(bankName);
    const options = await this.banks.listByTenant(tenantId);

    return options.find((option) => {
      const aliases = bankAliases(option.name);
      return aliases.has(normalizedInput) || aliases.has(compactInput);
    });
  }
}

export function normalizePaymentMethod(paymentMethod: PaymentMethod): PaymentMethod {
  const normalizedBank = paymentMethod.bank?.trim();
  if (paymentMethod.kind === 'cash') {
    return { kind: 'cash' };
  }

  if (paymentMethod.kind === 'card') {
    return {
      kind: 'card',
      cardType: paymentMethod.cardType,
      bank: normalizedBank || undefined
    };
  }

  return {
    kind: 'transfer',
    bank: normalizedBank || undefined
  };
}

function paymentMethodMatchesOption(paymentMethod: PaymentMethod, option: PaymentMethodOption) {
  if (paymentMethod.kind !== option.kind) return false;
  if (paymentMethod.kind !== 'card') return true;
  if (!paymentMethod.cardType) return false;
  return paymentMethod.cardType === option.cardType;
}

function bankAliases(name: string) {
  const normalized = normalizeLookup(name);
  const compact = compactLookup(name);
  const aliases = new Set([normalized, compact]);

  switch (compact) {
    case 'bancodecreditoeinversiones':
      aliases.add('bci');
      break;
    case 'bancodelestadodechile':
      aliases.add('bancoestado');
      aliases.add('banco estado');
      aliases.add('be');
      break;
    case 'bancodechile':
      aliases.add('chile');
      aliases.add('banco chile');
      break;
    case 'bancosantanderchile':
      aliases.add('santander');
      break;
    case 'bancoitauchile':
      aliases.add('itau');
      aliases.add('itaú');
      break;
    case 'scotiabankchile':
      aliases.add('scotia');
      aliases.add('scotiabank');
      break;
    case 'bancofalabella':
      aliases.add('falabella');
      aliases.add('cmr');
      break;
    case 'bancoripley':
      aliases.add('ripley');
      break;
    case 'bancobice':
      aliases.add('bice');
      break;
    case 'bancointernacional':
      aliases.add('internacional');
      break;
    case 'bancoconsorcio':
      aliases.add('consorcio');
      break;
    case 'tannerbancodigital':
      aliases.add('tanner');
      break;
    case 'tenpobankchile':
      aliases.add('tenpo');
      break;
  }

  return aliases;
}

function normalizeLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactLookup(value: string) {
  return normalizeLookup(value).replace(/\s+/g, '');
}
