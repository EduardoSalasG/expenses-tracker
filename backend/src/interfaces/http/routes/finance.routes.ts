import type { Express } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { FinanceController } from '../controllers/finance.controller.js';
import { requireAuth } from '../middleware.js';
import { asyncHandler } from '../utils.js';

export function registerFinanceRoutes(app: Express, container: AppContainer) {
  const controller = new FinanceController(container);
  const auth = requireAuth(container);

  app.post('/expenses', auth, asyncHandler(controller.createExpense));
  app.get('/expenses', auth, asyncHandler(controller.listExpenses));
  app.get('/expenses/recent', auth, asyncHandler(controller.recentExpenses));
  app.post('/incomes', auth, asyncHandler(controller.createIncome));
  app.get('/incomes', auth, asyncHandler(controller.listIncomes));
  app.get('/categories', auth, asyncHandler(controller.listCategories));
  app.post('/categories', auth, asyncHandler(controller.createCategory));
  app.get('/budgets/monthly', auth, asyncHandler(controller.monthlyBudgets));
  app.put('/budgets/monthly', auth, asyncHandler(controller.upsertMonthlyBudget));
  app.get('/reports', auth, asyncHandler(controller.report));
  app.put('/report-preferences', auth, asyncHandler(controller.updateReportPreferences));
}
