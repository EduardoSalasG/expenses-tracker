import type { Express } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { FinanceController } from '../controllers/finance.controller.js';
import { requireAuth } from '../middleware.js';
import { asyncHandler } from '../utils.js';

export function registerFinanceRoutes(app: Express, container: AppContainer) {
  const controller = new FinanceController(container);
  const auth = requireAuth(container);

  app.post('/expenses', auth, asyncHandler(controller.createExpense));
  app.put('/expenses/:expenseId', auth, asyncHandler(controller.updateExpense));
  app.get('/expenses', auth, asyncHandler(controller.listExpenses));
  app.get('/expenses/recent', auth, asyncHandler(controller.recentExpenses));
  app.post('/incomes', auth, asyncHandler(controller.createIncome));
  app.get('/incomes', auth, asyncHandler(controller.listIncomes));
  app.get('/categories', auth, asyncHandler(controller.listCategories));
  app.post('/categories', auth, asyncHandler(controller.createCategory));
  app.get('/budgets', auth, asyncHandler(controller.monthlyBudgets));
  app.put('/budgets', auth, asyncHandler(controller.upsertMonthlyBudget));
  // Backward compatibility (legacy clients). Can be disabled by env flag.
  if (container.config.legacyBudgetsEndpointsEnabled) {
    app.get('/budgets/monthly', auth, asyncHandler(controller.monthlyBudgets));
    app.put('/budgets/monthly', auth, asyncHandler(controller.upsertMonthlyBudget));
  }
  app.get('/reports', auth, asyncHandler(controller.report));
  app.get('/reports/expenses/yearly-monthly', auth, asyncHandler(controller.yearlyExpensesMonthlyTotals));
  app.get('/reports/expenses/monthly-daily', auth, asyncHandler(controller.monthlyExpensesDailyTotals));
  app.get('/reports/expenses/weekly-daily', auth, asyncHandler(controller.weeklyExpensesDailyTotals));
  app.get('/reports/incomes/yearly-monthly', auth, asyncHandler(controller.yearlyIncomesMonthlyTotals));
  app.get('/reports/incomes/monthly-daily', auth, asyncHandler(controller.monthlyIncomesDailyTotals));
  app.get('/reports/expenses/category-totals', auth, asyncHandler(controller.periodExpenseCategoryTotals));
  app.put('/report-preferences', auth, asyncHandler(controller.updateReportPreferences));
}
