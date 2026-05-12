import type { Category, InboundTextMessage, User } from '../../domain/index.js';
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
    private readonly clock: Clock
  ) {}

  async execute(input: InboundTextMessage) {
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

    const user = await this.users.findByPhoneNumber(input.fromPhoneNumber);
    if (!user) {
      await this.auditMessage(input, { parsingStatus: 'unknown_user' });
      return { status: 'ignored_unregistered_sender' as const };
    }

    const isRecentDuplicate = await this.messageAudits.existsRecentDuplicate({
      channel: input.channel,
      fromPhoneNumber: input.fromPhoneNumber,
      message: input.message,
      since: new Date(this.clock.now().getTime() - 2 * 60 * 1000),
      excludeProviderMessageId: input.providerMessageId
    });
    if (isRecentDuplicate) {
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'failed'
      });
      await this.reply(user, input.fromPhoneNumber, 'Detecté un posible mensaje duplicado reciente y no lo volví a guardar.');
      return { status: 'duplicate_ignored' as const };
    }

    const categories = await this.categories.listByTenant(user.tenantId);
    const pendingDraft = await this.pendingDrafts.findActive(user.tenantId, user.id, this.clock.now(), input.channel);
    if (pendingDraft) {
      return this.processPendingDraft(input, user, categories, pendingDraft.originalMessage, pendingDraft.draft);
    }

    const interpreted = await this.interpreter.interpret(input.message, {
      user,
      categories,
      now: this.clock.now()
    });

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
    await this.reply(user, input.fromPhoneNumber, clarificationMessage(missingFields));
    return { status: 'needs_confirmation' as const, missingFields };
  }

  private async processPendingDraft(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    originalMessage: string,
    draft: unknown
  ) {
    if (isCancelMessage(input.message)) {
      await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'failed'
      });
      await this.reply(user, input.fromPhoneNumber, 'Ok, descarté el movimiento pendiente.');
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
    await this.reply(user, input.fromPhoneNumber, clarificationMessage(missingFields));
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
      await this.reply(user, input.fromPhoneNumber, formatReportMessage(interpreted.period, period.label, report));
      return { status: 'report_sent' as const, report };
    }

    if (interpreted.intent === 'ask_budget_status') {
      const month = interpreted.month ?? this.clock.now().toISOString().slice(0, 7);
      const { from, to } = monthPeriod(month);
      const [budgets, report] = await Promise.all([
        this.budgets.listMonthly(user.tenantId, month),
        this.report(user.tenantId, from, to)
      ]);
      const budgetMessage = formatBudgetStatusMessage(month, budgets, report.expenses, categories, interpreted.categoryName);
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'saved'
      });
      if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id, input.channel);
      await this.reply(user, input.fromPhoneNumber, budgetMessage);
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
    await this.reply(user, input.fromPhoneNumber, `Ingreso guardado: ${formatMoney(income.currency, income.amount)} por ${income.concept}.`);
    return { status: 'income_saved' as const, income };
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

    const expense = await this.expenses.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: this.clock.now().toISOString(),
      amount: interpreted.amount,
      currency: user.preferredCurrency,
      concept: interpreted.concept,
      categoryId: category.id,
      subcategoryId: matchedCategory.subcategory?.id,
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
    await this.reply(user, input.fromPhoneNumber, [
      'Gasto guardado.',
      `Monto: ${formatMoney(expense.currency, expense.amount)}.`,
      `Concepto: ${expense.concept}.`,
      `Categoría: ${preciseCategoryLabel(categories, category.id, matchedCategory.subcategory?.id)}.`
    ].join('\n'));
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

  private reply(user: User, toPhoneNumber: string, body: string) {
    return this.messaging.sendText(toPhoneNumber, `${user.preferredName}, ${body}`);
  }
}

function preciseCategoryLabel(categories: Category[], categoryId: string, subcategoryId?: string) {
  const category = categories.find((item) => item.id === categoryId);
  const subcategory = subcategoryId ? categories.find((item) => item.id === subcategoryId) : undefined;
  if (subcategory) return `${category?.name ?? 'Uncategorized'} > ${subcategory.name}`;
  return category?.name ?? 'Uncategorized';
}
