import type { Category, User } from '../../domain/types.js';
import type {
  BudgetRepository,
  CategoryRepository,
  Clock,
  ExpenseRepository,
  IncomeRepository,
  MessageInterpreterPort,
  WhatsAppMessageAuditRepository,
  WhatsAppPendingDraftRepository,
  UserRepository,
  WhatsAppProvider
} from '../ports.js';
import { categoryByInterpretedName, inferCategoryFromText, interpretedMessageSchema, isCompleteExpense, isCompleteIncome, type InterpretedMessage } from '../message-interpreter.js';
import {
  clarificationMessage,
  canStoreDraft,
  isCancelMessage,
  mergePendingDraft,
  missingFieldsFor
} from '../services/whatsapp-draft.service.js';
import {
  filterReportByCategory,
  formatBudgetStatusMessage,
  formatMoney,
  formatReportMessage,
  monthPeriod,
  reportPeriod,
  totalsByCurrency
} from '../services/reporting.service.js';

export class ProcessWhatsAppExpenseUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly expenses: ExpenseRepository,
    private readonly incomes: IncomeRepository,
    private readonly budgets: BudgetRepository,
    private readonly messageAudits: WhatsAppMessageAuditRepository,
    private readonly pendingDrafts: WhatsAppPendingDraftRepository,
    private readonly whatsapp: WhatsAppProvider,
    private readonly interpreter: MessageInterpreterPort,
    private readonly clock: Clock
  ) {}

  async execute(input: { providerMessageId?: string; fromPhoneNumber: string; message: string }) {
    const reserved = input.providerMessageId
      ? await this.messageAudits.reserve({
        providerMessageId: input.providerMessageId,
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

    const categories = await this.categories.listByTenant(user.tenantId);
    const pendingDraft = await this.pendingDrafts.findActive(user.tenantId, user.id, this.clock.now());
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
    await this.whatsapp.sendText(input.fromPhoneNumber, clarificationMessage(missingFields));
    return { status: 'needs_confirmation' as const, missingFields };
  }

  private async processPendingDraft(
    input: { providerMessageId?: string; fromPhoneNumber: string; message: string },
    user: User,
    categories: Category[],
    originalMessage: string,
    draft: unknown
  ) {
    if (isCancelMessage(input.message)) {
      await this.pendingDrafts.clear(user.tenantId, user.id);
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'failed'
      });
      await this.whatsapp.sendText(input.fromPhoneNumber, 'Ok, descarté el movimiento pendiente.');
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
    await this.whatsapp.sendText(input.fromPhoneNumber, clarificationMessage(missingFields));
    return { status: 'needs_confirmation' as const, missingFields };
  }

  private async trySaveInterpreted(
    input: { providerMessageId?: string; fromPhoneNumber: string; message: string },
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
      if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id);
      await this.whatsapp.sendText(input.fromPhoneNumber, formatReportMessage(interpreted.period, period.label, report));
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
      if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id);
      await this.whatsapp.sendText(input.fromPhoneNumber, budgetMessage);
      return { status: 'budget_status_sent' as const };
    }

    return this.trySaveExpense(input, user, categories, interpreted, options);
  }

  private async trySaveIncome(
    input: { providerMessageId?: string; fromPhoneNumber: string; message: string },
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
    if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id);
    await this.whatsapp.sendText(input.fromPhoneNumber, `Ingreso guardado: ${formatMoney(income.currency, income.amount)} por ${income.concept}.`);
    return { status: 'income_saved' as const, income };
  }

  private async trySaveExpense(
    input: { providerMessageId?: string; fromPhoneNumber: string; message: string },
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
    if (options.clearDraft) await this.pendingDrafts.clear(user.tenantId, user.id);
    const categoryLabel = matchedCategory.subcategory
      ? `${category.name} > ${matchedCategory.subcategory.name}`
      : category.name;
    await this.whatsapp.sendText(input.fromPhoneNumber, `Gasto guardado: ${formatMoney(expense.currency, expense.amount)} por ${expense.concept}. Categoría: ${categoryLabel}.`);
    return { status: 'saved' as const, expense };
  }

  private storePendingDraft(
    input: { fromPhoneNumber: string; message: string },
    user: User,
    interpreted: InterpretedMessage
  ) {
    return this.pendingDrafts.upsert({
      tenantId: user.tenantId,
      userId: user.id,
      originalMessage: input.message,
      draft: interpreted,
      missingFields: missingFieldsFor(interpreted),
      expiresAt: new Date(this.clock.now().getTime() + 30 * 60 * 1000).toISOString()
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
    input: { providerMessageId?: string; fromPhoneNumber: string; message: string },
    audit: {
      tenantId?: string;
      userId?: string;
      parsingStatus: 'saved' | 'needs_confirmation' | 'unknown_user' | 'failed';
      expenseId?: string;
    }
  ) {
    if (input.providerMessageId) {
      return this.messageAudits.updateByProviderMessageId(input.providerMessageId, audit);
    }

    return this.messageAudits.create({
      ...audit,
      fromPhoneNumber: input.fromPhoneNumber,
      message: input.message
    });
  }
}
