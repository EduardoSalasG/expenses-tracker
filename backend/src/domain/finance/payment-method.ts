import type { CardType, PaymentMethod, PaymentMethodKind } from '../types.js';

export function createCashPaymentMethod(): PaymentMethod {
  return { kind: 'cash' };
}

export function createTransferPaymentMethod(bank?: string): PaymentMethod {
  return {
    kind: 'transfer',
    bank: normalizeBank(bank)
  };
}

export function createCardPaymentMethod(input: { bank?: string; cardType?: CardType }): PaymentMethod {
  return {
    kind: 'card',
    bank: normalizeBank(input.bank),
    cardType: input.cardType
  };
}

export function assertPaymentMethodKind(kind: string): asserts kind is PaymentMethodKind {
  if (!['cash', 'card', 'transfer'].includes(kind)) {
    throw new Error(`Unsupported payment method kind: ${kind}`);
  }
}

function normalizeBank(bank?: string) {
  const normalized = bank?.trim();
  return normalized || undefined;
}
