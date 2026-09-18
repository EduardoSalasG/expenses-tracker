export interface DashboardPriority {
  id: string;
  tone: 'info' | 'warning' | 'danger';
  titleKey: string;
  descriptionKey: string;
  route: string;
  queryParams: Record<string, string>;
  context?: Record<string, string>;
}

export interface DashboardPriorityInput {
  budgetProgress: Array<{ label: string; progress: number }>;
  upcomingInstallments: Array<{ periodKey: string; currency: string; total: number }>;
  memberBalances: Array<{ userId: string; preferredName: string; currency: string; balanceAmount: number }>;
}

export function deriveDashboardPriorities(input: DashboardPriorityInput): DashboardPriority[] {
  const budgetPriorities = input.budgetProgress
    .filter((budget) => budget.progress >= 100)
    .map((budget) => ({
      id: `budget-${toPriorityId(budget.label)}`,
      tone: 'danger' as const,
      titleKey: 'dashboard_priority_budget_title',
      descriptionKey: 'dashboard_priority_budget_description',
      route: '/budgets',
      queryParams: {},
      context: { category: budget.label }
    }));
  const installmentPriority: DashboardPriority[] = input.upcomingInstallments.some((item) => Number(item.total) > 0)
    ? [{ id: 'upcoming-installments', tone: 'info', titleKey: 'dashboard_priority_installments_title', descriptionKey: 'dashboard_priority_installments_description', route: '/expenses', queryParams: {} }]
    : [];
  const debtPriorities = input.memberBalances
    .filter((member) => member.balanceAmount < -0.004)
    .map((member) => ({
      id: `shared-debt-${member.userId}-${member.currency}`,
      tone: 'warning' as const,
      titleKey: 'dashboard_priority_shared_debt_title',
      descriptionKey: 'dashboard_priority_shared_debt_description',
      route: '/settings',
      queryParams: { section: 'accounts' },
      context: { member: member.preferredName }
    }));
  return [...budgetPriorities, ...installmentPriority, ...debtPriorities];
}

function toPriorityId(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}
