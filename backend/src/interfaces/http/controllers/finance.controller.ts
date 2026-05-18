import type { Request, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import type { AuthenticatedRequest } from '../middleware.js';
import {
  createCategorySchema,
  createExpenseSchema,
  createIncomeSchema,
  expenseQuerySchema,
  incomeQuerySchema,
  monthlyBudgetSchema,
  reportMonthQuerySchema,
  reportPreferencesSchema,
  reportWeekStartQuerySchema,
  reportYearQuerySchema,
  reportQuerySchema
} from '../schemas.js';
import { parseBody } from '../utils.js';

export class FinanceController {
  constructor(private readonly container: AppContainer) {}

  createExpense = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createExpenseSchema, request.body);
    response.status(201).json(await this.container.useCases.finance.createExpense({
      ...body,
      tenantId: authRequest.auth.tenantId,
      userId: authRequest.auth.userId
    }));
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

  monthlyBudgets = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const month = String(request.query.month ?? new Date().toISOString().slice(0, 7));
    response.json(await this.container.useCases.finance.monthlyBudgets(authRequest.auth.tenantId, month));
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
