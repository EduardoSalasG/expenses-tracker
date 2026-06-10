import type { Category, Expense, Income, InboundTextMessage, User } from '../../domain/index.js';
import type {
  BudgetRepository,
  CategoryRepository,
  Clock,
  ExpenseRepository,
  IncomeRepository,
  MessagingMessageAuditRepository,
  MessagingPendingDraftRepository,
  MessagingProvider,
  MessageInterpreterPort,
  UserRepository
} from '../ports.js';
import { categoryByInterpretedName, inferCategoryFromText, interpretedMessageSchema, isCompleteExpense, isCompleteIncome, type InterpretedMessage } from '../message-interpreter.js';
import {
  clarificationMessage,
  canStoreDraft,
  isCancelMessage,
  mergePendingDraft,
  missingFieldsFor
} from '../services/messaging-draft.service.js';
import {
  filterReportByCategory,
  formatBudgetStatusMessage,
  formatMoney,
  formatReportMessage,
  monthPeriod,
  reportPeriod,
  totalsByCurrency
} from '../services/reporting.service.js';
import { normalizeCategorySelection } from '../services/category-normalization.service.js';

export class ProcessInboundFinanceMessageUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly expenses: ExpenseRepository,
    private readonly incomes: IncomeRepository,
    private readonly budgets: BudgetRepository,
    private readonly messageAudits: MessagingMessageAuditRepository,
    private readonly pendingDrafts: MessagingPendingDraftRepository,
    private readonly messaging: MessagingProvider,
    private readonly interpreter: MessageInterpreterPort,
    private readonly clock: Clock,
    private readonly options: { frontendPublicOrigin: string }
  ) {}

  async execute(input: InboundTextMessage) {
    if (input.channel === 'telegram' && input.providerUserId && isTelegramLinkCommand(input.message)) {
      const phoneNumber = extractPhoneNumberFromLinkCommand(input.message);
      if (!phoneNumber) {
        await this.replyAnonymous(input, telegramLinkUsageMessage());
        return { status: 'needs_confirmation' as const, missingFields: ['phone_number'] };
      }

      const linkedUser = await this.users.linkTelegramChatByPhone(phoneNumber, input.providerUserId, extractTelegramUsername(input.fromPhoneNumber));
      if (!linkedUser) {
        await this.replyAnonymous(input, telegramLinkNotFoundMessage());
        return { status: 'ignored_unregistered_sender' as const };
      }

      await this.reply(
        linkedUser,
        input.replyTo ?? input.fromPhoneNumber,
        telegramLinkedMessage(linkedUser, this.options.frontendPublicOrigin),
        input.channel
      );
      return { status: 'telegram_linked' as const };
    }

    const reserved = input.providerMessageId
      ? await this.messageAudits.reserve({
        providerMessageId: input.providerMessageId,
        channel: input.channel,
        fromPhoneNumber: input.fromPhoneNumber,
        message: input.message
      })
      : true;

    if (!reserved) {
      return { status: 'duplicate_ignored' as const };
    }

    const user = input.channel === 'telegram' && input.providerUserId
      ? await this.users.findByTelegramChatId(input.providerUserId)
      : await this.users.findByPhoneNumber(input.fromPhoneNumber);
    if (!user) {
      await this.auditMessage(input, { parsingStatus: 'unknown_user' });
      if (input.channel === 'telegram') {
        await this.replyAnonymous(input, telegramUnlinkedMessage());
      }
      return { status: 'ignored_unregistered_sender' as const };
    }

    const categories = await this.categories.listByTenant(user.tenantId);
    const pendingDraft = await this.pendingDrafts.findActive(user.tenantId, user.id, this.clock.now(), input.channel);
    if (pendingDraft) {
      return this.processPendingDraft(input, user, categories, pendingDraft.originalMessage, pendingDraft.draft);
    }

    const isRecentDuplicate = await this.messageAudits.existsRecentDuplicate({
      channel: input.channel,
      fromPhoneNumber: input.fromPhoneNumber,
      message: input.message,
      since: new Date(this.clock.now().getTime() - 2 * 60 * 1000),
      excludeProviderMessageId: input.providerMessageId
    });
    if (isRecentDuplicate) {
      await this.pendingDrafts.upsert({
        tenantId: user.tenantId,
        userId: user.id,
        originalMessage: input.message,
        draft: {
          kind: 'duplicate_confirmation',
          originalMessage: input.message
        },
        missingFields: ['duplicate_confirmation'],
        expiresAt: new Date(this.clock.now().getTime() + 30 * 60 * 1000).toISOString(),
        channel: input.channel
      });
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, duplicateDetectedMessage(user), input.channel);
      return { status: 'duplicate_needs_confirmation' as const };
    }

    const interpreted = await this.interpreter.interpret(input.message, {
      user,
      categories,
      now: this.clock.now()
    });

    if (interpreted.intent === 'update_movement') {
      return this.updateMovement(input, user, categories, interpreted);
    }

    const saved = await this.trySaveInterpreted(input, user, categories, interpreted);
    if (saved) return saved;

    if (canStoreDraft(interpreted)) {
      await this.storePendingDraft(input, user, interpreted);
    }
    const missingFields = missingFieldsFor(interpreted);
    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'needs_confirmation'
    });
    await this.reply(user, input.fromPhoneNumber, clarificationMessage(missingFields, user.preferredLanguage), input.channel);
    return { status: 'needs_confirmation' as const, missingFields };
  }

  private async processPendingDraft(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    originalMessage: string,
    draft: unknown
  ) {
    if (isDuplicateConfirmationDraft(draft)) {
      if (isCancelMessage(input.message)) {
        await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
        await this.auditMessage(input, {
          tenantId: user.tenantId,
          userId: user.id,
          parsingStatus: 'failed'
        });
        await this.reply(user, input.replyTo ?? input.fromPhoneNumber, duplicateDiscardedMessage(user), input.channel);
        return { status: 'duplicate_discarded' as const };
      }

      if (!isDuplicateSaveMessage(input.message)) {
        await this.auditMessage(input, {
          tenantId: user.tenantId,
          userId: user.id,
          parsingStatus: 'needs_confirmation'
        });
        await this.reply(user, input.replyTo ?? input.fromPhoneNumber, duplicateConfirmReminderMessage(user), input.channel);
        return { status: 'needs_confirmation' as const, missingFields: ['duplicate_confirmation'] };
      }

      const interpretedOriginal = await this.interpreter.interpret(draft.originalMessage, {
        user,
        categories,
        now: this.clock.now()
      });
      const saved = await this.trySaveInterpreted({
        ...input,
        message: draft.originalMessage
      }, user, categories, interpretedOriginal, { clearDraft: true });
      if (saved) return saved;

      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, duplicateIncompleteMessage(user), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: missingFieldsFor(interpretedOriginal) };
    }

    if (isCancelMessage(input.message)) {
      await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'failed'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, pendingDiscardedMessage(user), input.channel);
      return { status: 'draft_cancelled' as const };
    }

    const interpretedReply = await this.interpreter.interpret(input.message, {
      user,
      categories,
      now: this.clock.now()
    });
    const pending = interpretedMessageSchema.parse(draft);
    const merged = mergePendingDraft(pending, interpretedReply, input.message);
    const completed = await this.trySaveInterpreted({
      ...input,
      message: `${originalMessage} | ${input.message}`
    }, user, categories, merged, { clearDraft: true });
    if (completed) return completed;

    await this.storePendingDraft(input, user, merged);
    const missingFields = missingFieldsFor(merged);
    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'needs_confirmation'
    });
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, clarificationMessage(missingFields, user.preferredLanguage), input.channel);
    return { status: 'needs_confirmation' as const, missingFields };
  }

  private async trySaveInterpreted(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    interpreted: InterpretedMessage,
    options: { clearDraft?: boolean } = {}
  ) {
    if (interpreted.intent === 'create_income') {
      return this.trySaveIncome(input, user, interpreted, options);
    }

    if (interpreted.intent === 'ask_report') {
      const period = reportPeriod(interpreted.period, this.clock.now());
      const report = filterReportByCategory(
        await this.report(user.tenantId, period.from, period.to),
        categories,
        interpreted.categoryName
      );
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'saved'
      });
      if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, formatReportMessage(interpreted.period, period.label, report, user.preferredLanguage), input.channel);
      return { status: 'report_sent' as const, report };
    }

    if (interpreted.intent === 'ask_budget_status') {
      const month = interpreted.month ?? this.clock.now().toISOString().slice(0, 7);
      const { from, to } = monthPeriod(month);
      const [budgets, report] = await Promise.all([
        this.budgets.listMonthly(user.tenantId),
        this.report(user.tenantId, from, to)
      ]);
      const budgetMessage = formatBudgetStatusMessage(
        month,
        budgets,
        report.expenses,
        report.incomes,
        categories,
        interpreted.categoryName,
        user.preferredLanguage
      );
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'saved'
      });
      if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, budgetMessage, input.channel);
      return { status: 'budget_status_sent' as const };
    }

    return this.trySaveExpense(input, user, categories, interpreted, options);
  }

  private async trySaveIncome(
    input: InboundTextMessage,
    user: User,
    interpreted: InterpretedMessage,
    options: { clearDraft?: boolean }
  ) {
    if (!isCompleteIncome(interpreted)) {
      return undefined;
    }

    const income = await this.incomes.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: this.clock.now().toISOString(),
      amount: interpreted.amount,
      currency: user.preferredCurrency,
      concept: interpreted.concept
    });
    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'saved'
    });
    if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, incomeSavedMessage(user, income), input.channel);
    return { status: 'income_saved' as const, income };
  }

  private async updateMovement(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    interpreted: Extract<InterpretedMessage, { intent: 'update_movement' }>
  ) {
    if (interpreted.needsConfirmation || (!interpreted.amount && !interpreted.concept && !interpreted.categoryName)) {
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, updateNeedsReferenceMessage(user), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: interpreted.missingFields };
    }

    const [recentExpenses, recentIncomes] = await Promise.all([
      interpreted.movementType === 'income' ? Promise.resolve([]) : this.expenses.listRecent(user.tenantId, 20),
      interpreted.movementType === 'expense' || interpreted.categoryName ? Promise.resolve([]) : this.incomes.listRecent(user.tenantId, 20)
    ]);
    const target = findReferencedMovement(recentExpenses, recentIncomes, categories, interpreted);
    if (!target || target.score < 2) {
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, updateTargetNotFoundMessage(user), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['reference'] };
    }

    if (target.kind === 'expense') {
      const matchedCategory: { category?: Category; subcategory?: Category } = interpreted.categoryName
        ? categoryByInterpretedName(categories, interpreted.categoryName, interpreted.subcategoryName)
        : {};
      const updated = await this.expenses.update({
        tenantId: user.tenantId,
        expenseId: target.movement.id,
        amount: interpreted.amount,
        concept: interpreted.concept,
        categoryId: matchedCategory.category?.id,
        subcategoryId: interpreted.categoryName ? matchedCategory.subcategory?.id ?? null : undefined
      });
      if (!updated) throw new Error('Expense not found for update.');
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'saved',
        expenseId: updated.id
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, expenseUpdatedMessage(user, categories, updated), input.channel);
      return { status: 'expense_updated' as const, expense: updated };
    }

    const updated = await this.incomes.update({
      tenantId: user.tenantId,
      incomeId: target.movement.id,
      amount: interpreted.amount,
      concept: interpreted.concept
    });
    if (!updated) throw new Error('Income not found for update.');
    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'saved'
    });
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, incomeUpdatedMessage(user, updated), input.channel);
    return { status: 'income_updated' as const, income: updated };
  }

  private async trySaveExpense(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    interpreted: InterpretedMessage,
    options: { clearDraft?: boolean }
  ) {
    if (interpreted.intent !== 'create_expense' || !isCompleteExpense(interpreted)) {
      return undefined;
    }

    const inferredCategory = inferCategoryFromText(categories, input.message);
    const matchedCategory = categoryByInterpretedName(
      categories,
      interpreted.categoryName ?? inferredCategory.categoryName,
      interpreted.subcategoryName ?? inferredCategory.subcategoryName
    );
    const category = matchedCategory.category ?? categories.find((item) => !item.parentId) ?? categories[0];
    if (!category) {
      throw new Error('No category is available for this tenant.');
    }

    const normalized = normalizeCategorySelection(categories, category.id, matchedCategory.subcategory?.id);

    const expense = await this.expenses.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: this.clock.now().toISOString(),
      amount: interpreted.amount,
      totalAmount: interpreted.amount,
      currency: user.preferredCurrency,
      concept: interpreted.concept,
      categoryId: normalized.categoryId,
      subcategoryId: normalized.subcategoryId,
      installmentCount: interpreted.installmentCount ?? 1,
      firstInstallmentDate: this.clock.now().toISOString(),
      purchaseDate: this.clock.now().toISOString(),
      paymentMethod: interpreted.paymentMethod,
      originalMessage: input.message
    });

    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'saved',
      expenseId: expense.id
    });
    if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, expenseSavedMessage(user, categories, expense, normalized.subcategoryId), input.channel);
    return { status: 'saved' as const, expense };
  }

  private storePendingDraft(
    input: InboundTextMessage,
    user: User,
    interpreted: InterpretedMessage
  ) {
    return this.pendingDrafts.upsert({
      tenantId: user.tenantId,
      userId: user.id,
      originalMessage: input.message,
      draft: interpreted,
      missingFields: missingFieldsFor(interpreted),
      expiresAt: new Date(this.clock.now().getTime() + 30 * 60 * 1000).toISOString(),
      channel: input.channel
    });
  }

  private async report(tenantId: string, from: string, to: string) {
    const [expenses, incomes] = await Promise.all([
      this.expenses.listByPeriod(tenantId, from, to),
      this.incomes.listByPeriod(tenantId, from, to)
    ]);

    return {
      from,
      to,
      expenses,
      incomes,
      expenseTotalsByCurrency: totalsByCurrency(expenses),
      incomeTotalsByCurrency: totalsByCurrency(incomes)
    };
  }

  private auditMessage(
    input: InboundTextMessage,
    audit: {
      tenantId?: string;
      userId?: string;
      parsingStatus: 'saved' | 'needs_confirmation' | 'unknown_user' | 'failed';
      expenseId?: string;
    }
  ) {
    if (input.providerMessageId) {
      return this.messageAudits.updateByProviderMessageId(input.providerMessageId, {
        ...audit,
        channel: input.channel
      });
    }

    return this.messageAudits.create({
      ...audit,
      channel: input.channel,
      fromPhoneNumber: input.fromPhoneNumber,
      message: input.message
    });
  }

  private reply(user: User, toPhoneNumber: string, body: string, channel: InboundTextMessage['channel']) {
    return this.messaging.sendText(toPhoneNumber, `${user.preferredName}, ${body}`, { channel });
  }

  private async replyAnonymous(input: InboundTextMessage, body: string) {
    const recipient = input.replyTo ?? input.fromPhoneNumber;
    if (!recipient) return;
    await this.messaging.sendText(recipient, body, { channel: input.channel });
  }
}

function preciseCategoryLabel(categories: Category[], categoryId: string, subcategoryId?: string) {
  const category = categories.find((item) => item.id === categoryId);
  const subcategory = subcategoryId ? categories.find((item) => item.id === subcategoryId) : undefined;
  if (subcategory) return `${category?.name ?? 'Uncategorized'} > ${subcategory.name}`;
  return category?.name ?? 'Uncategorized';
}

function duplicateDetectedMessage(user: User) {
  return user.preferredLanguage === 'en'
    ? 'I detected a recent possible duplicate movement. Reply "save" to keep it anyway or "discard" to ignore it.'
    : 'Detecté un posible movimiento duplicado reciente. Responde "guardar" para guardarlo igual o "descartar" para no registrarlo.';
}

function duplicateDiscardedMessage(user: User) {
  return user.preferredLanguage === 'en' ? 'Done, I discarded the duplicate movement.' : 'Ok, descarté el movimiento duplicado.';
}

function duplicateConfirmReminderMessage(user: User) {
  return user.preferredLanguage === 'en'
    ? 'Reply "save" to keep it anyway or "discard" to avoid saving it.'
    : 'Responde "guardar" para registrarlo igual o "descartar" para no guardarlo.';
}

function duplicateIncompleteMessage(user: User) {
  return user.preferredLanguage === 'en'
    ? 'I could not save the duplicate because it is still incomplete. Please resend it with amount, concept, and payment method.'
    : 'No pude guardar el duplicado porque quedó incompleto. Reenvía el movimiento con monto, concepto y medio de pago.';
}

function pendingDiscardedMessage(user: User) {
  return user.preferredLanguage === 'en' ? 'Done, I discarded the pending movement.' : 'Ok, descarté el movimiento pendiente.';
}

function updateNeedsReferenceMessage(user: User) {
  return user.preferredLanguage === 'en'
    ? 'I need you to specify which field to change and which movement it refers to.'
    : 'Necesito que indiques qué campo cambiar y a qué movimiento corresponde.';
}

function updateTargetNotFoundMessage(user: User) {
  return user.preferredLanguage === 'en'
    ? 'I could not identify the movement to update with enough confidence. Please resend the exact amount and concept of the original movement.'
    : 'No encontré con suficiente certeza el movimiento a modificar. Reenvíame el monto y concepto exactos del movimiento original.';
}

function incomeSavedMessage(user: User, income: Income) {
  if (user.preferredLanguage === 'en') {
    return `Income saved: ${formatMoney(income.currency, income.amount, 'en')} for ${income.concept}.`;
  }
  return `Ingreso guardado: ${formatMoney(income.currency, income.amount, 'es')} por ${income.concept}.`;
}

function incomeUpdatedMessage(user: User, income: Income) {
  if (user.preferredLanguage === 'en') {
    return [
      'Income updated.',
      `Amount: ${formatMoney(income.currency, income.amount, 'en')}.`,
      `Concept: ${income.concept}.`
    ].join('\n');
  }
  return [
    'Ingreso actualizado.',
    `Monto: ${formatMoney(income.currency, income.amount, 'es')}.`,
    `Concepto: ${income.concept}.`
  ].join('\n');
}

function expenseUpdatedMessage(user: User, categories: Category[], expense: Expense) {
  if (user.preferredLanguage === 'en') {
    return [
      'Expense updated.',
      `Amount: ${formatMoney(expense.currency, expense.amount, 'en')}.`,
      `Concept: ${expense.concept}.`,
      `Category: ${preciseCategoryLabel(categories, expense.categoryId, expense.subcategoryId)}.`
    ].join('\n');
  }
  return [
    'Gasto actualizado.',
    `Monto: ${formatMoney(expense.currency, expense.amount, 'es')}.`,
    `Concepto: ${expense.concept}.`,
    `Categoría: ${preciseCategoryLabel(categories, expense.categoryId, expense.subcategoryId)}.`
  ].join('\n');
}

function expenseSavedMessage(user: User, categories: Category[], expense: Expense, subcategoryId?: string) {
  const purchaseAmount = expense.totalAmount ?? expense.amount;
  const installmentLine = (expense.installmentCount ?? 1) > 1
    ? user.preferredLanguage === 'en'
      ? `Installments: ${expense.installmentCount} of ${formatMoney(expense.currency, expense.amount, 'en')}.`
      : `Cuotas: ${expense.installmentCount} de ${formatMoney(expense.currency, expense.amount, 'es')}.`
    : undefined;
  if (user.preferredLanguage === 'en') {
    return [
      'Expense saved.',
      `Amount: ${formatMoney(expense.currency, purchaseAmount, 'en')}.`,
      installmentLine,
      `Concept: ${expense.concept}.`,
      `Category: ${preciseCategoryLabel(categories, expense.categoryId, subcategoryId)}.`
    ].filter(Boolean).join('\n');
  }
  return [
    'Gasto guardado.',
    `Monto: ${formatMoney(expense.currency, purchaseAmount, 'es')}.`,
    installmentLine,
    `Concepto: ${expense.concept}.`,
    `Categoría: ${preciseCategoryLabel(categories, expense.categoryId, subcategoryId)}.`
  ].filter(Boolean).join('\n');
}

function findReferencedMovement(
  expenses: Expense[],
  incomes: Income[],
  categories: Category[],
  interpreted: Extract<InterpretedMessage, { intent: 'update_movement' }>
) {
  const candidates = [
    ...expenses.map((movement) => ({
      kind: 'expense' as const,
      movement,
      score: movementScore({
        amount: movement.amount,
        concept: movement.concept,
        categoryName: preciseCategoryLabel(categories, movement.categoryId, movement.subcategoryId)
      }, interpreted)
    })),
    ...incomes.map((movement) => ({
      kind: 'income' as const,
      movement,
      score: movementScore({
        amount: movement.amount,
        concept: movement.concept
      }, interpreted)
    }))
  ];

  return candidates.sort((left, right) => right.score - left.score)[0];
}

function movementScore(
  candidate: { amount: number; concept: string; categoryName?: string },
  interpreted: Extract<InterpretedMessage, { intent: 'update_movement' }>
) {
  let score = 0;
  if (interpreted.referenceAmount && Math.round(candidate.amount) === Math.round(interpreted.referenceAmount)) score += 2;
  if (interpreted.referenceConcept && normalize(candidate.concept).includes(normalize(interpreted.referenceConcept))) score += 2;
  if (interpreted.referenceConcept && normalize(interpreted.referenceConcept).includes(normalize(candidate.concept))) score += 2;
  if (interpreted.referenceCategoryName && candidate.categoryName && normalize(candidate.categoryName).includes(normalize(interpreted.referenceCategoryName))) score += 1;
  return score;
}

function normalize(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isDuplicateConfirmationDraft(draft: unknown): draft is { kind: 'duplicate_confirmation'; originalMessage: string } {
  return Boolean(
    draft &&
    typeof draft === 'object' &&
    'kind' in draft &&
    draft.kind === 'duplicate_confirmation' &&
    'originalMessage' in draft &&
    typeof draft.originalMessage === 'string'
  );
}

function isDuplicateSaveMessage(message: string) {
  return /^(guardar|guardalo|guárdalo|guardar igual|save|save it|save anyway|si|sí|ok|okay|dale|confirmo|confirmar|yes|yep)$/i.test(message.trim());
}

function isTelegramLinkCommand(message: string) {
  return /^\/(link|vincular)\b/i.test(message.trim());
}

function extractPhoneNumberFromLinkCommand(message: string) {
  const match = message.match(/\+?\d{8,15}/);
  if (!match) return undefined;
  return match[0].startsWith('+') ? match[0] : `+${match[0]}`;
}

function extractTelegramUsername(senderRef: string) {
  return senderRef.startsWith('@') ? senderRef.slice(1) : undefined;
}

function telegramLinkUsageMessage() {
  return 'Para vincular tu cuenta escribe: /link +569XXXXXXXX';
}

function telegramLinkNotFoundMessage() {
  return 'No encontre ese telefono registrado. Primero registrate en la web y luego vuelve a enviar /link.';
}

function telegramLinkedMessage(user: User, frontendPublicOrigin: string) {
  const dashboardUrl = `${frontendPublicOrigin.replace(/\/$/, '')}/dashboard`;
  return user.preferredLanguage === 'en'
    ? [
      'Telegram is now connected to your account.',
      '',
      'Send me this month’s income and the expenses as they happen. I will keep everything organized for you.',
      '',
      'Examples:',
      '- Salary income 1.200.000, bank transfer',
      '- 25.000 lunch at Tavelli, debit card BCI',
      '- 18.990 Uber, cash',
      '- How much did I spend this month?',
      '',
      `You can review your dashboard here: ${dashboardUrl}`
    ].join('\n')
    : [
      'Telegram quedó conectado a tu cuenta.',
      '',
      'Cuéntame el ingreso de este mes y los gastos a medida que vayan ocurriendo. Yo los iré ordenando por ti.',
      '',
      'Ejemplos:',
      '- Ingreso de sueldo 1.200.000, transferencia',
      '- 25.000 almuerzo en Tavelli, debito BCI',
      '- 18.990 Uber, efectivo',
      '- Cuanto gaste este mes?',
      '',
      `Puedes revisar tu dashboard aquí: ${dashboardUrl}`
    ].join('\n');
}

function telegramUnlinkedMessage() {
  return 'Tu Telegram aun no esta vinculado. Envia /link +569XXXXXXXX con tu telefono registrado.';
}
