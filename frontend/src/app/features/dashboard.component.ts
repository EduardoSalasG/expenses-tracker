import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Chart, type ChartConfiguration, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { ApiService, type Category, type Expense, type MonthlyBudget, type Report } from '../core/api.service';

Chart.register(...registerables);

interface BudgetProgressRow {
  label: string;
  spent: number;
  amount: number;
  currency: string;
  progress: number;
  remaining: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        <p class="text-sm font-medium uppercase tracking-wide text-slate-500">{{ monthLabel() }}</p>
        <h1 class="mt-1 text-3xl font-semibold text-slate-950">Dashboard</h1>
      </div>
      <div class="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Net balance <strong class="ml-2 text-slate-950">{{ netBalanceLabel() }}</strong>
      </div>
    </div>

    @if (loading()) {
      <section class="grid gap-4 md:grid-cols-3">
        <mat-card class="p-4"><div class="h-24 animate-pulse rounded bg-slate-100"></div></mat-card>
        <mat-card class="p-4"><div class="h-24 animate-pulse rounded bg-slate-100"></div></mat-card>
        <mat-card class="p-4"><div class="h-24 animate-pulse rounded bg-slate-100"></div></mat-card>
      </section>
    } @else if (error()) {
      <mat-card class="border border-red-100 p-4 text-red-700">{{ error() }}</mat-card>
    } @else {
      <section class="grid gap-4 lg:grid-cols-3">
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-slate-500">This month expenses</div>
          <div class="mt-2 text-3xl font-semibold text-slate-950">{{ expenseTotalLabel() }}</div>
          <div class="mt-3 text-sm text-slate-500">{{ report()?.expenses?.length ?? 0 }} expense records</div>
        </mat-card>
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-slate-500">This month income</div>
          <div class="mt-2 text-3xl font-semibold text-slate-950">{{ incomeTotalLabel() }}</div>
          <div class="mt-3 text-sm text-slate-500">{{ report()?.incomes?.length ?? 0 }} income records</div>
        </mat-card>
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-slate-500">Budget progress</div>
          @if (overallBudget()) {
            <div class="mt-2 text-3xl font-semibold text-slate-950">{{ overallBudget()?.progress }}%</div>
            <mat-progress-bar class="mt-4" mode="determinate" [value]="overallBudget()?.progress ?? 0" />
            <div class="mt-3 text-sm text-slate-500">{{ overallBudget()?.spentLabel }} spent of {{ overallBudget()?.amountLabel }}</div>
          } @else {
            <div class="mt-2 text-3xl font-semibold text-slate-950">No budget</div>
            <div class="mt-3 text-sm text-slate-500">Create monthly budgets to track progress.</div>
          }
        </mat-card>
      </section>

      <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <mat-card class="page-panel p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Cash flow by currency</h2>
          </div>
          <div class="h-72">
            <canvas #currencyChart aria-label="Cash flow by currency chart"></canvas>
          </div>
        </mat-card>

        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">Expenses by category</h2>
          <div class="h-72">
            <canvas #categoryChart aria-label="Expenses by category chart"></canvas>
          </div>
        </mat-card>
      </section>

      <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">Recent expenses</h2>
          <div class="grid gap-1">
            @for (expense of recentExpenses(); track expense.id) {
              <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-slate-100 py-3 last:border-0">
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ expense.concept }}</div>
                  <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                    <span>{{ formatDate(expense.date) }}</span>
                    <span>{{ categoryName(expense.categoryId) }}</span>
                    <span>{{ paymentLabel(expense) }}</span>
                  </div>
                </div>
                <strong class="whitespace-nowrap text-right">{{ formatMoney(expense.currency, expense.amount) }}</strong>
              </div>
            } @empty {
              <p class="text-slate-500">No expenses yet.</p>
            }
          </div>
        </mat-card>

        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">Monthly budgets</h2>
          <div class="grid gap-4">
            @for (budget of budgetProgress(); track budget.label + budget.currency) {
              <div>
                <div class="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span class="font-medium">{{ budget.label }}</span>
                  <span class="text-slate-500">{{ formatMoney(budget.currency, budget.remaining) }} left</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="budget.progress" />
                <div class="mt-1 text-xs text-slate-500">
                  {{ formatMoney(budget.currency, budget.spent) }} of {{ formatMoney(budget.currency, budget.amount) }}
                </div>
              </div>
            } @empty {
              <p class="text-slate-500">No budgets configured for this month.</p>
            }
          </div>
        </mat-card>
      </section>
    }
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('currencyChart') private currencyChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') private categoryChartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly recentExpenses = signal<Expense[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly budgets = signal<MonthlyBudget[]>([]);
  readonly report = signal<Report | null>(null);
  readonly monthLabel = signal(new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date()));
  readonly expenseTotalLabel = computed(() => this.formatTotals(this.report()?.expenseTotalsByCurrency));
  readonly incomeTotalLabel = computed(() => this.formatTotals(this.report()?.incomeTotalsByCurrency));
  readonly netBalanceLabel = computed(() => {
    const report = this.report();
    if (!report) return '-';
    const currencies = new Set([...Object.keys(report.expenseTotalsByCurrency), ...Object.keys(report.incomeTotalsByCurrency)]);
    if (!currencies.size) return 'No movement';
    return [...currencies]
      .sort()
      .map((currency) => this.formatMoney(currency, (report.incomeTotalsByCurrency[currency] ?? 0) - (report.expenseTotalsByCurrency[currency] ?? 0)))
      .join(' | ');
  });
  readonly budgetProgress = computed(() => this.buildBudgetProgress());
  readonly overallBudget = computed(() => {
    const rows = this.budgetProgress();
    if (!rows.length) return null;
    const spent = rows.reduce((total, row) => total + row.spent, 0);
    const amount = rows.reduce((total, row) => total + row.amount, 0);
    const currency = rows[0].currency;
    return {
      progress: Math.min(Math.round((spent / amount) * 100), 100),
      spentLabel: this.formatMoney(currency, spent),
      amountLabel: this.formatMoney(currency, amount)
    };
  });

  private currencyChart?: Chart;
  private categoryChart?: Chart;
  private viewReady = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    const { from, to, month } = currentMonthRange();
    forkJoin({
      recentExpenses: this.api.recentExpenses(8),
      report: this.api.report(from, to),
      categories: this.api.categories(),
      budgets: this.api.monthlyBudgets(month)
    }).subscribe({
      next: ({ recentExpenses, report, categories, budgets }) => {
        this.recentExpenses.set(recentExpenses);
        this.report.set(report);
        this.categories.set(categories);
        this.budgets.set(budgets);
        this.loading.set(false);
        setTimeout(() => this.renderCharts());
      },
      error: () => {
        this.error.set('Dashboard data could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy() {
    this.currencyChart?.destroy();
    this.categoryChart?.destroy();
  }

  categoryName(categoryId: string) {
    return this.categories().find((category) => category.id === categoryId)?.name ?? 'Uncategorized';
  }

  paymentLabel(expense: Expense) {
    if (expense.paymentMethod.kind === 'cash') return 'Cash';
    if (expense.paymentMethod.kind === 'transfer') {
      return expense.paymentMethod.bank ? `${expense.paymentMethod.bank} transfer` : 'Transfer';
    }
    const card = expense.paymentMethod.cardType ? `${expense.paymentMethod.cardType} card` : 'Card';
    return expense.paymentMethod.bank ? `${expense.paymentMethod.bank} ${card}` : card;
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
  }

  formatMoney(currency: string, amount: number) {
    if (currency.toUpperCase() === 'CLP') return `$${Number(amount).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(Number(amount));
  }

  private formatTotals(totals?: Record<string, number>) {
    if (!totals || !Object.keys(totals).length) return 'No movement';
    return Object.entries(totals)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, amount]) => this.formatMoney(currency, amount))
      .join(' | ');
  }

  private buildBudgetProgress(): BudgetProgressRow[] {
    const expenses = this.report()?.expenses ?? [];
    return this.budgets().map((budget) => {
      const spent = expenses
        .filter((expense) =>
          expense.currency === budget.currency &&
          expense.categoryId === budget.categoryId &&
          (!budget.subcategoryId || expense.subcategoryId === budget.subcategoryId)
        )
        .reduce((total, expense) => total + Number(expense.amount), 0);
      const progress = Math.min(Math.round((spent / budget.amount) * 100), 100);
      return {
        label: this.categoryName(budget.subcategoryId ?? budget.categoryId),
        spent,
        amount: Number(budget.amount),
        currency: budget.currency,
        progress,
        remaining: Math.max(Number(budget.amount) - spent, 0)
      };
    });
  }

  private renderCharts() {
    if (!this.viewReady || this.loading() || this.error()) return;
    this.renderCurrencyChart();
    this.renderCategoryChart();
  }

  private renderCurrencyChart() {
    const canvas = this.currencyChartCanvas?.nativeElement;
    const report = this.report();
    if (!canvas || !report) return;
    const currencies = [...new Set([...Object.keys(report.expenseTotalsByCurrency), ...Object.keys(report.incomeTotalsByCurrency)])].sort();
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: currencies.length ? currencies : ['No data'],
        datasets: [
          {
            label: 'Income',
            data: currencies.map((currency) => report.incomeTotalsByCurrency[currency] ?? 0),
            backgroundColor: '#0f766e'
          },
          {
            label: 'Expenses',
            data: currencies.map((currency) => report.expenseTotalsByCurrency[currency] ?? 0),
            backgroundColor: '#dc2626'
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } }
      }
    };
    this.currencyChart?.destroy();
    this.currencyChart = new Chart(canvas, config);
  }

  private renderCategoryChart() {
    const canvas = this.categoryChartCanvas?.nativeElement;
    const expenses = this.report()?.expenses ?? [];
    if (!canvas) return;
    const totals = expenses.reduce<Record<string, number>>((grouped, expense) => {
      const label = this.categoryName(expense.categoryId);
      grouped[label] = (grouped[label] ?? 0) + Number(expense.amount);
      return grouped;
    }, {});
    const labels = Object.keys(totals);
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No expenses'],
        datasets: [{
          data: labels.length ? labels.map((label) => totals[label]) : [1],
          backgroundColor: ['#2563eb', '#0f766e', '#f59e0b', '#dc2626', '#7c3aed', '#475569']
        }]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
      }
    };
    this.categoryChart?.destroy();
    this.categoryChart = new Chart(canvas, config);
  }
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    month: from.toISOString().slice(0, 7)
  };
}
