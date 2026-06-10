import type { Request, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import type { AuthenticatedRequest } from '../middleware.js';
import {
  bankOptionSchema,
  createCategorySchema,
  createExpenseSchema,
  createIncomeSchema,
  expenseQuerySchema,
  incomeQuerySchema,
  monthlyBudgetSchema,
  paymentMethodOptionSchema,
  reportMonthQuerySchema,
  reportPreferencesSchema,
  reportWeekStartQuerySchema,
  reportYearQuerySchema,
  reportQuerySchema,
  updateBankOptionSchema,
  updateExpenseSchema,
  updateIncomeSchema,
  updatePaymentMethodOptionSchema
} from '../schemas.js';
import { parseBody } from '../utils.js';

export class FinanceController {
  constructor(private readonly container: AppContainer) {}

  createExpense = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createExpenseSchema, request.body);
    try {
      response.status(201).json(await this.container.useCases.finance.createExpense({
        ...body,
        tenantId: authRequest.auth.tenantId,
        userId: authRequest.auth.userId
      }));
    } catch (error) {
      if (error instanceof Error && (error.message === 'Payment method option not found.' || error.message === 'Bank option not found.')) {
        response.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  updateExpense = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(updateExpenseSchema, request.body);
    const expenseId = Array.isArray(request.params.expenseId) ? request.params.expenseId[0] : request.params.expenseId;
    try {
      response.json(await this.container.useCases.finance.updateExpense({
        ...body,
        expenseId,
        tenantId: authRequest.auth.tenantId
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Expense not found.') {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof Error && (error.message === 'Payment method option not found.' || error.message === 'Bank option not found.')) {
        response.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  listExpenses = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = expenseQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.listExpenses({
      ...query,
      tenantId: authRequest.auth.tenantId
    }));
  };

  recentExpenses = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const limit = Number(request.query.limit ?? 10);
    response.json(await this.container.useCases.finance.recentExpenses(authRequest.auth.tenantId, limit));
  };

  createIncome = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createIncomeSchema, request.body);
    response.status(201).json(await this.container.useCases.finance.createIncome({
      ...body,
      tenantId: authRequest.auth.tenantId,
      userId: authRequest.auth.userId
    }));
  };

  updateIncome = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(updateIncomeSchema, request.body);
    const incomeId = Array.isArray(request.params.incomeId) ? request.params.incomeId[0] : request.params.incomeId;
    try {
      response.json(await this.container.useCases.finance.updateIncome({
        ...body,
        incomeId,
        tenantId: authRequest.auth.tenantId
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Income not found.') {
        response.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  listIncomes = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = incomeQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.listIncomes({
      ...query,
      tenantId: authRequest.auth.tenantId
    }));
  };

  listCategories = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.finance.listCategories(authRequest.auth.tenantId));
  };

  createCategory = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createCategorySchema, request.body);
    response.status(201).json(await this.container.useCases.finance.createCategory({
      ...body,
      tenantId: authRequest.auth.tenantId,
      isDefault: false
    }));
  };

  listBankOptions = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.finance.listBankOptions(authRequest.auth.tenantId));
  };

  createBankOption = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(bankOptionSchema, request.body);
    response.status(201).json(await this.container.useCases.finance.createBankOption({
      tenantId: authRequest.auth.tenantId,
      name: body.name,
      isDefault: false
    }));
  };

  updateBankOption = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(updateBankOptionSchema, request.body);
    const bankOptionId = Array.isArray(request.params.bankOptionId) ? request.params.bankOptionId[0] : request.params.bankOptionId;
    try {
      response.json(await this.container.useCases.finance.updateBankOption({
        tenantId: authRequest.auth.tenantId,
        bankOptionId,
        name: body.name
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Bank option not found.') {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof Error && (error.message === 'Default bank options cannot be modified.' || error.message === 'Bank option is in use by existing expenses.')) {
        response.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  deleteBankOption = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const bankOptionId = Array.isArray(request.params.bankOptionId) ? request.params.bankOptionId[0] : request.params.bankOptionId;
    try {
      response.json(await this.container.useCases.finance.deleteBankOption({
        tenantId: authRequest.auth.tenantId,
        bankOptionId
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Bank option not found.') {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof Error && (error.message === 'Default bank options cannot be deleted.' || error.message === 'Bank option is in use by existing expenses.')) {
        response.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  listPaymentMethodOptions = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.finance.listPaymentMethodOptions(authRequest.auth.tenantId));
  };

  createPaymentMethodOption = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(paymentMethodOptionSchema, request.body);
    response.status(201).json(await this.container.useCases.finance.createPaymentMethodOption({
      tenantId: authRequest.auth.tenantId,
      name: body.name,
      kind: body.kind,
      cardType: body.cardType,
      isDefault: false
    }));
  };

  updatePaymentMethodOption = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(updatePaymentMethodOptionSchema, request.body);
    const paymentMethodOptionId = Array.isArray(request.params.paymentMethodOptionId) ? request.params.paymentMethodOptionId[0] : request.params.paymentMethodOptionId;
    try {
      response.json(await this.container.useCases.finance.updatePaymentMethodOption({
        tenantId: authRequest.auth.tenantId,
        paymentMethodOptionId,
        name: body.name,
        kind: body.kind,
        cardType: body.cardType
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Payment method option not found.') {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof Error && (error.message === 'Default payment method options cannot be modified.' || error.message === 'Payment method option is in use by existing expenses.')) {
        response.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  deletePaymentMethodOption = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const paymentMethodOptionId = Array.isArray(request.params.paymentMethodOptionId) ? request.params.paymentMethodOptionId[0] : request.params.paymentMethodOptionId;
    try {
      response.json(await this.container.useCases.finance.deletePaymentMethodOption({
        tenantId: authRequest.auth.tenantId,
        paymentMethodOptionId
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Payment method option not found.') {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof Error && (error.message === 'Default payment method options cannot be deleted.' || error.message === 'Payment method option is in use by existing expenses.')) {
        response.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  monthlyBudgets = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.finance.monthlyBudgets(authRequest.auth.tenantId));
  };

  upsertMonthlyBudget = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(monthlyBudgetSchema, request.body);
    response.json(await this.container.useCases.finance.upsertMonthlyBudget({
      ...body,
      tenantId: authRequest.auth.tenantId
    }));
  };

  report = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.report(authRequest.auth.tenantId, query.from, query.to));
  };

  yearlyExpensesMonthlyTotals = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportYearQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.yearlyExpensesMonthlyTotals(authRequest.auth.tenantId, query.year));
  };

  monthlyExpensesDailyTotals = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportMonthQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.monthlyExpensesDailyTotals(authRequest.auth.tenantId, query.month));
  };

  weeklyExpensesDailyTotals = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportWeekStartQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.weeklyExpensesDailyTotals(authRequest.auth.tenantId, query.weekStart));
  };

  upcomingExpenseInstallmentsMonthlyTotals = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const month = typeof request.query.month === 'string' ? request.query.month : new Date().toISOString().slice(0, 7);
    const months = Number(request.query.months ?? 6);
    response.json(await this.container.useCases.finance.upcomingExpenseInstallmentsMonthlyTotals(
      authRequest.auth.tenantId,
      month,
      Number.isFinite(months) ? Math.min(Math.max(months, 1), 24) : 6
    ));
  };

  yearlyIncomesMonthlyTotals = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportYearQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.yearlyIncomesMonthlyTotals(authRequest.auth.tenantId, query.year));
  };

  monthlyIncomesDailyTotals = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportMonthQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.monthlyIncomesDailyTotals(authRequest.auth.tenantId, query.month));
  };

  periodExpenseCategoryTotals = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportQuerySchema.parse(request.query);
    response.json(await this.container.useCases.finance.periodExpenseCategoryTotals(authRequest.auth.tenantId, query.from, query.to));
  };

  updateReportPreferences = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(reportPreferencesSchema, request.body);
    response.json(await this.container.useCases.updateReportPreferences.execute(authRequest.auth.userId, body.preferences));
  };
}
