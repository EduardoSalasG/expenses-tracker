import type { InterpretedMessage } from '../message-interpreter.js';

export function canStoreDraft(interpreted: InterpretedMessage) {
  if (interpreted.intent === 'create_expense') {
    return Boolean(interpreted.amount || interpreted.concept || interpreted.paymentMethod);
  }

  if (interpreted.intent === 'create_income') {
    return Boolean(interpreted.amount || interpreted.concept);
  }

  return false;
}

export function mergePendingDraft(
  pending: InterpretedMessage,
  reply: InterpretedMessage,
  replyText: string
): InterpretedMessage {
  if (isAffirmativeMessage(replyText)) return pending;
  if (pending.intent === 'create_expense') {
    const replyExpense = reply.intent === 'create_expense' ? reply : undefined;
    const merged = {
      ...pending,
      amount: pending.amount ?? replyExpense?.amount,
      currency: pending.currency ?? replyExpense?.currency,
      concept: pending.concept ?? replyExpense?.concept,
      categoryName: replyExpense?.categoryName ?? pending.categoryName,
      subcategoryName: replyExpense?.subcategoryName ?? pending.subcategoryName,
      paymentMethod: pending.paymentMethod ?? replyExpense?.paymentMethod
    };
    return {
      ...merged,
      missingFields: missingFieldsFor(merged),
      needsConfirmation: missingFieldsFor(merged).length > 0
    };
  }

  if (pending.intent === 'create_income') {
    const replyIncome = reply.intent === 'create_income' ? reply : undefined;
    const merged = {
      ...pending,
      amount: pending.amount ?? replyIncome?.amount,
      currency: pending.currency ?? replyIncome?.currency,
      concept: pending.concept ?? replyIncome?.concept
    };
    return {
      ...merged,
      missingFields: missingFieldsFor(merged),
      needsConfirmation: missingFieldsFor(merged).length > 0
    };
  }

  return reply;
}

export function missingFieldsFor(interpreted: InterpretedMessage) {
  if (interpreted.intent === 'create_expense') {
    return [
      interpreted.amount === undefined ? 'amount' : undefined,
      interpreted.concept ? undefined : 'concept',
      interpreted.paymentMethod ? undefined : 'paymentMethod'
    ].filter((field): field is string => Boolean(field));
  }

  if (interpreted.intent === 'create_income') {
    return [
      interpreted.amount === undefined ? 'amount' : undefined,
      interpreted.concept ? undefined : 'concept'
    ].filter((field): field is string => Boolean(field));
  }

  return ['intent'];
}

export function clarificationMessage(missingFields: string[]) {
  const labels: Record<string, string> = {
    amount: 'monto',
    concept: 'concepto',
    paymentMethod: 'medio de pago',
    intent: 'si es gasto, ingreso, reporte o presupuesto'
  };
  const missing = missingFields.map((field) => labels[field] ?? field).join(', ');
  return `Me falta: ${missing}. Puedes responder solo con el dato faltante, por ejemplo "transferencia desde bci", "tdc bci" o "efectivo". Responde "cancelar" para descartarlo.`;
}

export function isCancelMessage(message: string) {
  return /\b(cancelar|cancela|descartar|descarta|no|olvida|ignora)\b/i.test(message.trim());
}

function isAffirmativeMessage(message: string) {
  return /^(si|sí|ok|okay|dale|confirmo|confirmar|yes|yep)$/i.test(message.trim());
}
