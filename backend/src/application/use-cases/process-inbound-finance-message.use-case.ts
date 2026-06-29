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
  BankOptionRepository,
  MessageInterpreterPort,
  PaymentMethodOptionRepository,
  UserRepository
} from '../ports.js';
import {
  categoryByInterpretedName,
  inferCategoryCandidateFromText,
  inferCategoryFromText,
  interpretedMessageSchema,
  isCompleteExpense,
  isCompleteIncome,
  type InterpretedMessage
} from '../message-interpreter.js';
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
import { PaymentSelectionService } from '../services/payment-selection.service.js';

export class ProcessInboundFinanceMessageUseCase {
  private readonly paymentSelections: PaymentSelectionService;

  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly expenses: ExpenseRepository,
    private readonly incomes: IncomeRepository,
    private readonly budgets: BudgetRepository,
    banks: BankOptionRepository,
    paymentMethods: PaymentMethodOptionRepository,
    private readonly messageAudits: MessagingMessageAuditRepository,
    private readonly pendingDrafts: MessagingPendingDraftRepository,
    private readonly messaging: MessagingProvider,
    private readonly interpreter: MessageInterpreterPort,
    private readonly clock: Clock,
    private readonly options: { frontendPublicOrigin: string }
  ) {
    this.paymentSelections = new PaymentSelectionService(banks, paymentMethods);
  }

  async execute(input: InboundTextMessage): Promise<{ status: string; missingFields?: string[]; [key: string]: unknown }> {
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

    if (shouldStartCategorySelection(interpreted)) {
      await this.storeCustomDraft(input, user, {
        kind: 'category_selection',
        originalMessage: input.message,
        expenseDraft: interpreted
      });
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.fromPhoneNumber, categoryClarificationMessage(user, categories), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

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

    if (isCategorySelectionDraft(draft)) {
      return this.processCategorySelectionDraft(input, user, categories, draft);
    }

    if (isCategoryDisambiguationDraft(draft)) {
      return this.processCategoryDisambiguationDraft(input, user, categories, draft);
    }

    if (isCategoryCreationConfirmDraft(draft)) {
      return this.processCategoryCreationConfirmDraft(input, user, categories, draft);
    }

    if (isCategoryCreationDetailsDraft(draft)) {
      return this.processCategoryCreationDetailsDraft(input, user, categories, draft);
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

    if (shouldStartCategorySelection(merged)) {
      await this.storeCustomDraft(input, user, {
        kind: 'category_selection',
        originalMessage,
        expenseDraft: merged
      });
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryClarificationMessage(user, categories), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

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

  private async processCategorySelectionDraft(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    draft: CategorySelectionDraft
  ) {
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

    const resolution = resolveCategoryInput(categories, input.message);
    if (resolution.kind === 'matched') {
      const completedDraft = {
        ...draft.expenseDraft,
        categoryName: resolution.category.name,
        subcategoryName: resolution.subcategory?.name,
        missingFields: missingFieldsFor({
          ...draft.expenseDraft,
          categoryName: resolution.category.name,
          subcategoryName: resolution.subcategory?.name
        }),
        needsConfirmation: false
      } satisfies Extract<InterpretedMessage, { intent: 'create_expense' }>;

      const result = await this.trySaveInterpreted(
        { ...input, message: `${draft.originalMessage} | ${input.message}` },
        user,
        categories,
        completedDraft,
        { clearDraft: true }
      );
      if (result) return result;

      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryClarificationMessage(user, categories), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

    if (resolution.kind === 'ambiguous') {
      await this.storeCustomDraft(input, user, {
        kind: 'category_disambiguation',
        originalMessage: draft.originalMessage,
        expenseDraft: draft.expenseDraft,
        options: resolution.options.map((option) => ({
          categoryId: option.category.id,
          subcategoryId: option.subcategory?.id
        }))
      });
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, ambiguousCategoryMessage(user, resolution.options), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

    const requestedName = resolution.kind === 'not_found' ? resolution.requestedName : titleCaseCategoryName(input.message.trim());
    await this.storeCustomDraft(input, user, {
      kind: 'category_creation_confirm',
      originalMessage: draft.originalMessage,
      expenseDraft: draft.expenseDraft,
      requestedName
    });
    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'needs_confirmation'
    });
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryNotFoundMessage(user, requestedName), input.channel);
    return { status: 'needs_confirmation' as const, missingFields: ['category'] };
  }

  private async processCategoryDisambiguationDraft(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    draft: CategoryDisambiguationDraft
  ) {
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

    const selected = selectAmbiguousCategoryOption(categories, draft.options, input.message);
    if (!selected) {
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(
        user,
        input.replyTo ?? input.fromPhoneNumber,
        ambiguousCategoryReminderMessage(user, hydrateCategoryOptions(categories, draft.options)),
        input.channel
      );
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

    const completedDraft = {
      ...draft.expenseDraft,
      categoryName: selected.category.name,
      subcategoryName: selected.subcategory?.name,
      missingFields: missingFieldsFor({
        ...draft.expenseDraft,
        categoryName: selected.category.name,
        subcategoryName: selected.subcategory?.name
      }),
      needsConfirmation: false
    } satisfies Extract<InterpretedMessage, { intent: 'create_expense' }>;

    const result = await this.trySaveInterpreted(
      { ...input, message: `${draft.originalMessage} | ${input.message}` },
      user,
      categories,
      completedDraft,
      { clearDraft: true }
    );
    if (result) return result;

    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'needs_confirmation'
    });
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryClarificationMessage(user, categories), input.channel);
    return { status: 'needs_confirmation' as const, missingFields: ['category'] };
  }

  private async processCategoryCreationConfirmDraft(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    draft: CategoryCreationConfirmDraft
  ) {
    if (isCancelMessage(input.message) || isNegativeMessage(input.message)) {
      await this.storeCustomDraft(input, user, {
        kind: 'category_selection',
        originalMessage: draft.originalMessage,
        expenseDraft: draft.expenseDraft
      });
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryRetryMessage(user), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

    if (!isAffirmativeSelection(input.message)) {
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryCreateConfirmReminderMessage(user, draft.requestedName), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

    await this.storeCustomDraft(input, user, {
      kind: 'category_creation_details',
      originalMessage: draft.originalMessage,
      expenseDraft: draft.expenseDraft,
      requestedName: draft.requestedName
    });
    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'needs_confirmation'
    });
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryCreateDetailsMessage(user, draft.requestedName, categories), input.channel);
    return { status: 'needs_confirmation' as const, missingFields: ['category'] };
  }

  private async processCategoryCreationDetailsDraft(
    input: InboundTextMessage,
    user: User,
    categories: Category[],
    draft: CategoryCreationDetailsDraft
  ) {
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

    const createRequest = parseCategoryCreationDetails(categories, input.message, draft.requestedName);
    if (!createRequest) {
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryCreateDetailsReminderMessage(user, draft.requestedName, categories), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

    const created = await this.categories.create({
      tenantId: user.tenantId,
      name: draft.requestedName,
      parentId: createRequest.parentId,
      isDefault: false
    });
    const refreshedCategories = await this.categories.listByTenant(user.tenantId);
    const category = createRequest.parentId
      ? refreshedCategories.find((item) => item.id === createRequest.parentId)
      : created;
    const subcategory = createRequest.parentId ? created : undefined;
    const completedDraft = {
      ...draft.expenseDraft,
      categoryName: category?.name,
      subcategoryName: subcategory?.name,
      missingFields: missingFieldsFor({
        ...draft.expenseDraft,
        categoryName: category?.name,
        subcategoryName: subcategory?.name
      }),
      needsConfirmation: false
    } satisfies Extract<InterpretedMessage, { intent: 'create_expense' }>;

    const result = await this.trySaveInterpreted(
      { ...input, message: `${draft.originalMessage} | ${input.message}` },
      user,
      refreshedCategories,
      completedDraft,
      { clearDraft: true }
    );
    if (result) return result;

    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'needs_confirmation'
    });
    await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryClarificationMessage(user, refreshedCategories), input.channel);
    return { status: 'needs_confirmation' as const, missingFields: ['category'] };
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

    const inferredCategory = inferCategoryCandidateFromText(categories, input.message);
    const matchedCategory = categoryByInterpretedName(
      categories,
      interpreted.categoryName ?? inferredCategory.categoryName,
      interpreted.subcategoryName ?? inferredCategory.subcategoryName
    );

    const categoryReliability = assessCategoryReliability(categories, input.message, interpreted, inferredCategory);
    if (!matchedCategory.category || categoryReliability === 'needs_selection') {
      await this.storeCustomDraft(input, user, {
        kind: 'category_selection',
        originalMessage: input.message,
        expenseDraft: {
          ...interpreted,
          missingFields: ['category'],
          needsConfirmation: true
        }
      });
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.reply(user, input.replyTo ?? input.fromPhoneNumber, categoryClarificationMessage(user, categories), input.channel);
      return { status: 'needs_confirmation' as const, missingFields: ['category'] };
    }

    const category = matchedCategory.category;
    const normalized = normalizeCategorySelection(categories, category.id, matchedCategory.subcategory?.id);
    const paymentSelection = await this.paymentSelections.resolve(user.tenantId, {
      paymentMethod: interpreted.paymentMethod
    });

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
      paymentMethod: paymentSelection.paymentMethod,
      paymentMethodOptionId: paymentSelection.paymentMethodOptionId,
      bankOptionId: paymentSelection.bankOptionId,
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

  private storeCustomDraft(
    input: InboundTextMessage,
    user: User,
    draft: CategorySelectionDraft | CategoryDisambiguationDraft | CategoryCreationConfirmDraft | CategoryCreationDetailsDraft
  ) {
    return this.pendingDrafts.upsert({
      tenantId: user.tenantId,
      userId: user.id,
      originalMessage: draft.originalMessage,
      draft,
      missingFields: ['category'],
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

type ExpenseDraft = Extract<InterpretedMessage, { intent: 'create_expense' }>;

interface CategorySelectionDraft {
  kind: 'category_selection';
  originalMessage: string;
  expenseDraft: ExpenseDraft;
}

interface CategoryDisambiguationDraft {
  kind: 'category_disambiguation';
  originalMessage: string;
  expenseDraft: ExpenseDraft;
  options: Array<{ categoryId: string; subcategoryId?: string }>;
}

interface CategoryCreationConfirmDraft {
  kind: 'category_creation_confirm';
  originalMessage: string;
  expenseDraft: ExpenseDraft;
  requestedName: string;
}

interface CategoryCreationDetailsDraft {
  kind: 'category_creation_details';
  originalMessage: string;
  expenseDraft: ExpenseDraft;
  requestedName: string;
}

function shouldStartCategorySelection(interpreted: InterpretedMessage): interpreted is ExpenseDraft {
  return interpreted.intent === 'create_expense'
    && interpreted.amount !== undefined
    && Boolean(interpreted.concept)
    && Boolean(interpreted.paymentMethod)
    && !interpreted.categoryName;
}

function assessCategoryReliability(
  categories: Category[],
  message: string,
  interpreted: ExpenseDraft,
  inferred: ReturnType<typeof inferCategoryCandidateFromText>
) {
  if (!interpreted.categoryName) return 'needs_selection' as const;
  if (interpreted.subcategoryName) return 'matched' as const;

  const normalizedMessage = normalizeLookup(message);
  const normalizedCategory = normalizeLookup(interpreted.categoryName);
  if (tokenIncludesNormalized(normalizedMessage, normalizedCategory)) {
    return 'matched' as const;
  }

  if (
    inferred.source === 'heuristic_subcategory' &&
    inferred.categoryName === interpreted.categoryName &&
    inferred.subcategoryName === interpreted.subcategoryName
  ) {
    return 'matched' as const;
  }

  const matched = categoryByInterpretedName(categories, interpreted.categoryName, interpreted.subcategoryName);
  if (!matched.category) return 'needs_selection' as const;

  return 'needs_selection' as const;
}

function resolveCategoryInput(categories: Category[], input: string) {
  const normalizedInput = cleanupCategoryReply(input);
  const byPath = matchCategoryPath(categories, normalizedInput);
  if (byPath) return { kind: 'matched' as const, category: byPath.category, subcategory: byPath.subcategory };

  const roots = categories.filter((category) => !category.parentId);
  const root = roots.find((category) => categoryAliases(category.name).has(normalizedInput));
  if (root) return { kind: 'matched' as const, category: root };

  const subcategories = categories.filter((category) => category.parentId);
  const exactSubcategories = subcategories
    .filter((subcategory) => categoryAliases(subcategory.name).has(normalizedInput))
    .map((subcategory) => ({
      subcategory,
      category: categories.find((category) => category.id === subcategory.parentId)!
    }));

  if (exactSubcategories.length === 1) {
    return {
      kind: 'matched' as const,
      category: exactSubcategories[0].category,
      subcategory: exactSubcategories[0].subcategory
    };
  }

  if (exactSubcategories.length > 1) {
    return {
      kind: 'ambiguous' as const,
      options: exactSubcategories
    };
  }

  return {
    kind: 'not_found' as const,
    requestedName: titleCaseCategoryName(normalizedInput || input.trim())
  };
}

function hydrateCategoryOptions(categories: Category[], options: Array<{ categoryId: string; subcategoryId?: string }>): Array<{ category: Category; subcategory?: Category }> {
  const hydrated: Array<{ category: Category; subcategory?: Category }> = [];
  for (const option of options) {
    const category = categories.find((item) => item.id === option.categoryId);
    if (!category) continue;
    const subcategory = option.subcategoryId ? categories.find((item) => item.id === option.subcategoryId) : undefined;
    hydrated.push({ category, subcategory });
  }
  return hydrated;
}

function selectAmbiguousCategoryOption(
  categories: Category[],
  options: Array<{ categoryId: string; subcategoryId?: string }>,
  input: string
) {
  const trimmed = input.trim();
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= options.length) {
    const selected = options[numeric - 1];
    const category = categories.find((item) => item.id === selected.categoryId);
    if (!category) return undefined;
    const subcategory = selected.subcategoryId ? categories.find((item) => item.id === selected.subcategoryId) : undefined;
    return { category, subcategory };
  }

  const byPath = matchCategoryPath(categories, cleanupCategoryReply(input));
  if (byPath) {
    const found = options.find((option) => option.categoryId === byPath.category.id && option.subcategoryId === byPath.subcategory?.id);
    if (found) return byPath;
  }

  return undefined;
}

function parseCategoryCreationDetails(categories: Category[], input: string, requestedName: string) {
  const normalized = normalizeLookup(input);
  if (/\b(root|main|principal|categoria principal|categoría principal|category)\b/.test(normalized) && !/\bsub\b/.test(normalized)) {
    return { parentId: undefined as string | undefined };
  }

  const roots = categories.filter((category) => !category.parentId);
  const parent = roots.find((category) => {
    for (const alias of categoryAliases(category.name)) {
      if (normalized.includes(alias)) return true;
    }
    return false;
  });
  if (!parent) return undefined;

  if (/\b(subcategory|subcategoria|subcategoría|under|de|en|in)\b/.test(normalized)) {
    return { parentId: parent.id };
  }

  if (normalizeLookup(requestedName) !== normalized) {
    return { parentId: parent.id };
  }

  return undefined;
}

function matchCategoryPath(categories: Category[], normalizedInput: string) {
  const compact = normalizedInput
    .replace(/\s*>\s*/g, '>')
    .replace(/\s*\/\s*/g, '/')
    .trim();
  if (!compact) return undefined;

  const separators = ['>', '/'];
  for (const separator of separators) {
    if (compact.includes(separator)) {
      const [left, right] = compact.split(separator).map((part) => part.trim()).filter(Boolean);
      if (!left || !right) continue;
      const category = categories.find((item) => !item.parentId && categoryAliases(item.name).has(left));
      const subcategory = categories.find((item) => item.parentId === category?.id && categoryAliases(item.name).has(right));
      if (category && subcategory) return { category, subcategory };
    }
  }

  const explicit = compact.match(/^(.*?)\s+(?:de|in|under|en)\s+(.*?)$/);
  if (!explicit) return undefined;
  const subName = explicit[1]?.trim();
  const categoryName = explicit[2]?.trim();
  const category = categories.find((item) => !item.parentId && categoryAliases(item.name).has(categoryName));
  const subcategory = categories.find((item) => item.parentId === category?.id && categoryAliases(item.name).has(subName));
  if (category && subcategory) return { category, subcategory };
  return undefined;
}

function cleanupCategoryReply(input: string) {
  return normalizeLookup(
    input
      .replace(/^(la\s+)?(categoria|categoría|subcategory|subcategor[ií]a|category)\s*(es|:)?\s*/i, '')
      .trim()
  );
}

function titleCaseCategoryName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9>\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryAliases(name: string) {
  const normalized = normalizeLookup(name);
  const aliases = new Set([normalized]);

  switch (normalized) {
    case 'food':
      aliases.add('comida');
      aliases.add('alimentacion');
      break;
    case 'groceries':
      aliases.add('supermercado');
      aliases.add('abarrotes');
      break;
    case 'restaurants':
      aliases.add('restaurantes');
      aliases.add('restaurant');
      break;
    case 'transport':
      aliases.add('transporte');
      break;
    case 'public transport':
      aliases.add('transporte publico');
      aliases.add('transporte publico');
      aliases.add('metro');
      aliases.add('micro');
      break;
    case 'uber':
      aliases.add('cabify');
      aliases.add('didi');
      break;
    case 'housing':
      aliases.add('vivienda');
      aliases.add('hogar');
      break;
    case 'rent':
      aliases.add('arriendo');
      aliases.add('renta');
      break;
    case 'health':
      aliases.add('salud');
      break;
    case 'appointments':
      aliases.add('citas');
      aliases.add('consultas');
      break;
    case 'medicines':
      aliases.add('medicinas');
      aliases.add('medicamentos');
      aliases.add('remedios');
      break;
    case 'procedures':
      aliases.add('procedimientos');
      break;
    case 'sports':
      aliases.add('deportes');
      break;
    case 'entertainment':
      aliases.add('entretenimiento');
      aliases.add('diversion');
      break;
    case 'theater':
      aliases.add('teatro');
      aliases.add('cine');
      break;
    case 'education':
      aliases.add('educacion');
      break;
    case 'services':
      aliases.add('servicios');
      break;
    case 'phone':
      aliases.add('telefono');
      aliases.add('celular');
      break;
    case 'other':
      aliases.add('otros');
      break;
    case 'gifts':
      aliases.add('regalos');
      aliases.add('regalo');
      break;
  }

  return aliases;
}

function tokenIncludesNormalized(text: string, token: string) {
  return new RegExp(`\\b${escapeRegExp(token)}\\b`).test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function categoryClarificationMessage(user: User, categories: Category[]) {
  const roots = categories.filter((category) => !category.parentId).map((category) => category.name).sort((a, b) => a.localeCompare(b));
  if (user.preferredLanguage === 'en') {
    return [
      'I could not identify the category for this movement with enough confidence.',
      `Reply with an existing category or subcategory, for example: ${roots.slice(0, 5).join(', ')}.`
    ].join('\n');
  }
  return [
    'No pude identificar con suficiente certeza la categoría de este movimiento.',
    `Responde con una categoría o subcategoría existente, por ejemplo: ${roots.slice(0, 5).join(', ')}.`
  ].join('\n');
}

function ambiguousCategoryMessage(user: User, options: Array<{ category: Category; subcategory?: Category }>) {
  const lines = options.map((option, index) => `${index + 1}. ${option.category.name}${option.subcategory ? ` > ${option.subcategory.name}` : ''}`);
  if (user.preferredLanguage === 'en') {
    return [
      'I found more than one matching category. Reply with the number or the full path:',
      ...lines
    ].join('\n');
  }
  return [
    'Encontré más de una categoría coincidente. Responde con el número o la ruta completa:',
    ...lines
  ].join('\n');
}

function ambiguousCategoryReminderMessage(user: User, options: Array<{ category: Category; subcategory?: Category }>) {
  return ambiguousCategoryMessage(user, options);
}

function categoryNotFoundMessage(user: User, requestedName: string) {
  return user.preferredLanguage === 'en'
    ? `I could not find "${requestedName}". Do you want to create it? Reply yes or no.`
    : `No encontré "${requestedName}". ¿Quieres crearla? Responde sí o no.`;
}

function categoryRetryMessage(user: User) {
  return user.preferredLanguage === 'en'
    ? 'Ok. Send me another existing category or subcategory.'
    : 'Ok. Envíame otra categoría o subcategoría existente.';
}

function categoryCreateConfirmReminderMessage(user: User, requestedName: string) {
  return user.preferredLanguage === 'en'
    ? `Reply yes to create "${requestedName}" or no to choose another category.`
    : `Responde sí para crear "${requestedName}" o no para elegir otra categoría.`;
}

function categoryCreateDetailsMessage(user: User, requestedName: string, categories: Category[]) {
  const rootExamples = categories.filter((item) => !item.parentId).map((item) => item.name).slice(0, 5).join(', ');
  if (user.preferredLanguage === 'en') {
    return [
      `How should I create "${requestedName}"?`,
      '- Reply "root category" to create it as a main category.',
      `- Reply "subcategory under Food" to create it below an existing category. Available examples: ${rootExamples}.`
    ].join('\n');
  }
  return [
    `¿Cómo quieres crear "${requestedName}"?`,
    '- Responde "categoría principal" para crearla como categoría raíz.',
    `- Responde "subcategoría de Food" para crearla debajo de una categoría existente. Ejemplos disponibles: ${rootExamples}.`
  ].join('\n');
}

function categoryCreateDetailsReminderMessage(user: User, requestedName: string, categories: Category[]) {
  return categoryCreateDetailsMessage(user, requestedName, categories);
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

function isCategorySelectionDraft(draft: unknown): draft is CategorySelectionDraft {
  return Boolean(draft && typeof draft === 'object' && 'kind' in draft && draft.kind === 'category_selection');
}

function isCategoryDisambiguationDraft(draft: unknown): draft is CategoryDisambiguationDraft {
  return Boolean(draft && typeof draft === 'object' && 'kind' in draft && draft.kind === 'category_disambiguation');
}

function isCategoryCreationConfirmDraft(draft: unknown): draft is CategoryCreationConfirmDraft {
  return Boolean(draft && typeof draft === 'object' && 'kind' in draft && draft.kind === 'category_creation_confirm');
}

function isCategoryCreationDetailsDraft(draft: unknown): draft is CategoryCreationDetailsDraft {
  return Boolean(draft && typeof draft === 'object' && 'kind' in draft && draft.kind === 'category_creation_details');
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

function isAffirmativeSelection(message: string) {
  return /^(si|sí|yes|y|ok|okay|dale|crear|create)$/i.test(message.trim());
}

function isNegativeMessage(message: string) {
  return /^(no|nop|nope)$/i.test(message.trim());
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
