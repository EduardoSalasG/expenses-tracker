import { describe, expect, it } from 'vitest';
import type { InterpretedMessage } from '../message-interpreter.js';
import { mergePendingDraft } from './messaging-draft.service.js';

describe('mergePendingDraft', () => {
  it('replaces an invalid pending date with a corrected date reply', () => {
    const pending: InterpretedMessage = {
      intent: 'create_expense', confidence: 0.45, amount: 2500, currency: 'CLP', concept: 'pan',
      date: '2026-05-06', dateExplicit: false, categoryName: 'Food', paymentMethod: { kind: 'cash' }, installmentCount: 1,
      missingFields: ['date'], needsConfirmation: true
    };
    const reply: InterpretedMessage = {
      intent: 'create_expense', confidence: 0.75, date: '2026-05-07', dateExplicit: true, installmentCount: 1,
      missingFields: [], needsConfirmation: false
    };

    expect(mergePendingDraft(pending, reply, '2026-05-07')).toMatchObject({
      date: '2026-05-07', missingFields: [], needsConfirmation: false
    });
  });

  it('keeps an invalid pending date unresolved when the reply omits a date', () => {
    const pending: InterpretedMessage = {
      intent: 'create_expense', confidence: 0.45, amount: 2500, currency: 'CLP', concept: 'pan',
      date: '2026-05-06', dateExplicit: false, categoryName: 'Food', paymentMethod: { kind: 'cash' }, installmentCount: 1,
      missingFields: ['date'], needsConfirmation: true
    };
    const reply: InterpretedMessage = {
      intent: 'create_expense', confidence: 0.45, concept: 'otra cosa', installmentCount: 1,
      missingFields: ['amount', 'paymentMethod'], needsConfirmation: true
    };

    expect(mergePendingDraft(pending, reply, 'otra cosa')).toMatchObject({
      date: '2026-05-06', missingFields: ['date'], needsConfirmation: true
    });
  });

  it('adds a bank from a bank-only reply without discarding the original payment method', () => {
    const pending: InterpretedMessage = {
      intent: 'create_expense', confidence: 0.45, amount: 2500, currency: 'CLP', concept: 'pan',
      categoryName: 'Food', paymentMethod: { kind: 'card', cardType: 'credit' }, installmentCount: 1,
      missingFields: ['bank'], needsConfirmation: true
    };
    const reply: InterpretedMessage = {
      intent: 'create_expense', confidence: 0.45, concept: 'bci', installmentCount: 1,
      missingFields: ['amount', 'paymentMethod'], needsConfirmation: true
    };

    expect(mergePendingDraft(pending, reply, 'bci')).toMatchObject({
      paymentMethod: { kind: 'card', cardType: 'credit', bank: 'bci' }, missingFields: [], needsConfirmation: false
    });
  });
});
