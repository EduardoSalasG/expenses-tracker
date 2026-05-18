import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
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

interface PeriodTotalRow {
  periodKey: string;
  currency: string;
  total: number;
}

interface CategoryTotalRow {
  categoryId: string;
  subcategoryId?: string;
  currency: string;
  total: number;
}

interface CategoryVariationRow {
  categoryId: string;
  categoryName: string;
  currency: string;
  currentTotal: number;
  previousTotal: number;
  delta: number;
  deltaPercent: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule, MatButtonModule],
  template: `
    <div class="mb-5 flex flex-col gap-4 border-b border-brand-border pb-5 sm:mb-6 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-brand-muted sm:text-sm">{{ periodLabel() }}</p>
        <h1 class="mt-1 text-2xl font-semibold text-brand-ink sm:text-3xl">Dashboard</h1>
      </div>
      <div class="grid gap-3 sm:grid-cols-[auto_auto] sm:items-center lg:flex lg:flex-wrap">
        <div class="grid grid-cols-2 overflow-hidden rounded border border-brand-border bg-brand-surface text-sm sm:inline-grid">
          <button mat-button type="button" class="!min-w-0" (click)="setViewMode('monthly')" [disabled]="viewMode() === 'monthly'">Monthly</button>
          <button mat-button type="button" class="!min-w-0" (click)="setViewMode('yearly')" [disabled]="viewMode() === 'yearly'">Annual</button>
        </div>
        @if (viewMode() === 'monthly') {
          <input
            type="month"
            class="min-h-11 rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink"
            [value]="selectedMonth()"
            (change)="changeMonth($event)"
          >
        } @else {
          <select
            class="min-h-11 rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink"
            [value]="selectedYear()"
            (change)="changeYear($event)"
          >
            @for (year of availableYears(); track year) {
              <option [value]="year">{{ year }}</option>
            }
          </select>
        }
        <div class="sm:col-span-2 rounded border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-muted shadow-sm lg:col-span-1">
          Net balance <strong class="ml-2 text-brand-ink">{{ netBalanceLabel() }}</strong>
        </div>
      </div>
    </div>

    @if (loading()) {
      <section class="grid gap-4 md:grid-cols-3">
        <mat-card class="p-4"><div class="h-24 animate-pulse rounded bg-brand-bg"></div></mat-card>
        <mat-card class="p-4"><div class="h-24 animate-pulse rounded bg-brand-bg"></div></mat-card>
        <mat-card class="p-4"><div class="h-24 animate-pulse rounded bg-brand-bg"></div></mat-card>
      </section>
    } @else if (error()) {
      <mat-card class="border border-red-100 p-4 text-red-700">{{ error() }}</mat-card>
    } @else {
      <section class="grid gap-4 lg:grid-cols-3">
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-brand-muted">{{ viewMode() === 'monthly' ? 'This month expenses' : 'This year expenses' }}</div>
          <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ expenseTotalLabel() }}</div>
          <div class="mt-3 text-sm text-brand-muted">{{ report()?.expenses?.length ?? 0 }} expense records</div>
        </mat-card>
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-brand-muted">{{ viewMode() === 'monthly' ? 'This month income' : 'This year income' }}</div>
          <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ incomeTotalLabel() }}</div>
          <div class="mt-3 text-sm text-brand-muted">{{ report()?.incomes?.length ?? 0 }} income records</div>
        </mat-card>
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-brand-muted">Budget progress</div>
          @if (overallBudget()) {
            <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ overallBudget()?.progress }}%</div>
            <mat-progress-bar class="mt-4" mode="determinate" [value]="overallBudget()?.progress ?? 0" />
            <div class="mt-3 text-sm text-brand-muted">{{ overallBudget()?.spentLabel }} spent of {{ overallBudget()?.amountLabel }}</div>
          } @else {
            <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">No budget</div>
            <div class="mt-3 text-sm text-brand-muted">Create monthly budgets to track progress.</div>
          }
        </mat-card>
      </section>

      <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <mat-card class="page-panel p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Cash flow by currency</h2>
          </div>
          <div class="h-64 sm:h-72">
            <canvas #currencyChart aria-label="Cash flow by currency chart"></canvas>
          </div>
        </mat-card>

        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">Expenses by category</h2>
          <div class="h-64 sm:h-72">
            <canvas #categoryChart aria-label="Expenses by category chart"></canvas>
          </div>
        </mat-card>
      </section>

      <section class="mt-4">
        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">
            {{ viewMode() === 'monthly' ? 'This week expenses' : 'This year expenses by month' }}
          </h2>
          <div class="h-64 sm:h-72">
            <canvas #weeklyChart aria-label="Weekly expenses chart"></canvas>
          </div>
        </mat-card>
      </section>

      <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">Recent expenses</h2>
          <div class="grid gap-1">
            @for (expense of recentExpenses(); track expense.id) {
              <div class="grid gap-2 border-b border-brand-border/70 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ expense.concept }}</div>
                  <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-brand-muted">
                    <span>{{ formatDate(expense.date) }}</span>
                    <span>{{ categoryName(expense.categoryId) }}</span>
                    <span>{{ paymentLabel(expense) }}</span>
                  </div>
                </div>
                <strong class="whitespace-nowrap text-left sm:text-right">{{ formatMoney(expense.currency, expense.amount) }}</strong>
              </div>
            } @empty {
              <p class="text-brand-muted">No expenses yet.</p>
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
                  <span class="text-brand-muted">{{ formatMoney(budget.currency, budget.remaining) }} left</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="budget.progress" />
                <div class="mt-1 text-xs text-brand-muted">
                  {{ formatMoney(budget.currency, budget.spent) }} of {{ formatMoney(budget.currency, budget.amount) }}
                </div>
              </div>
            } @empty {
              <p class="text-brand-muted">No budgets configured for this month.</p>
            }
          </div>
        </mat-card>
      </section>

      <section class="mt-4">
        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">Category variation vs previous period</h2>
          <div class="grid gap-2">
            @for (row of categoryVariation(); track row.categoryId + row.currency) {
              <div class="grid gap-2 border-b border-brand-border/70 py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ row.categoryName }} ({{ row.currency }})</div>
                  <div class="mt-1 text-sm text-brand-muted">
                    Current {{ formatMoney(row.currency, row.currentTotal) }} vs previous {{ formatMoney(row.currency, row.previousTotal) }}
                  </div>
                </div>
                <div class="text-left sm:text-right" [class.text-red-700]="row.delta > 0" [class.text-emerald-700]="row.delta < 0" [class.text-brand-muted]="row.delta === 0">
                  <div class="font-semibold">
                    {{ row.delta > 0 ? '+' : row.delta < 0 ? '-' : '' }}{{ formatMoney(row.currency, abs(row.delta)) }}
                  </div>
                  <div class="text-xs">
                    {{ row.deltaPercent === null ? 'n/a' : (abs(row.deltaPercent).toFixed(2) + '%') }}
                  </div>
                </div>
              </div>
            } @empty {
              <p class="text-brand-muted">No variation data for this period.</p>
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
  @ViewChild('weeklyChart') private weeklyChartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly recentExpenses = signal<Expense[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly budgets = signal<MonthlyBudget[]>([]);
  readonly report = signal<Report | null>(null);
  readonly periodTotals = signal<PeriodTotalRow[]>([]);
  readonly categoryTotals = signal<CategoryTotalRow[]>([]);
  readonly viewMode = signal<'monthly' | 'yearly'>('monthly');
  readonly selectedMonth = signal(new Date().toISOString().slice(0, 7));
  readonly selectedYear = signal(new Date().getUTCFullYear());
  readonly availableYears = signal(buildYearOptions());
  readonly periodLabel = computed(() => {
    if (this.viewMode() === 'monthly') {
      const [year, month] = this.selectedMonth().split('-').map(Number);
      return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, 1)));
    }
    return `${this.selectedYear()}`;
  });
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
  readonly categoryVariation = computed(() => this.buildCategoryVariation());
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
  private weeklyChart?: Chart;
  private viewReady = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy() {
    this.currencyChart?.destroy();
    this.categoryChart?.destroy();
    this.weeklyChart?.destroy();
  }

  setViewMode(mode: 'monthly' | 'yearly') {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.loadDashboard();
  }

  changeMonth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value || value === this.selectedMonth()) return;
    this.selectedMonth.set(value);
    this.selectedYear.set(Number(value.slice(0, 4)));
    this.loadDashboard();
  }

  changeYear(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!value || value === this.selectedYear()) return;
    this.selectedYear.set(value);
    this.loadDashboard();
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

  abs(value: number) {
    return Math.abs(value);
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

  private buildCategoryVariation(): CategoryVariationRow[] {
    const report = this.report();
    if (!report?.expenseVariationByCategory?.length) return [];
    return [...report.expenseVariationByCategory]
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
      .slice(0, 8);
  }

  private renderCharts() {
    if (!this.viewReady || this.loading() || this.error()) return;
    this.renderCurrencyChart();
    this.renderCategoryChart();
    this.renderWeeklyChart();
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
            backgroundColor: '#1D4ED8'
          },
          {
            label: 'Expenses',
            data: currencies.map((currency) => report.expenseTotalsByCurrency[currency] ?? 0),
            backgroundColor: '#0B1F3A'
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
    const totalsRows = this.categoryTotals();
    if (!canvas) return;
    const totals = totalsRows.reduce<Record<string, number>>((grouped, row) => {
      const label = `${this.categoryName(row.categoryId)} (${row.currency})`;
      grouped[label] = (grouped[label] ?? 0) + Number(row.total);
      return grouped;
    }, {});
    const labels = Object.keys(totals);
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No expenses'],
        datasets: [{
          data: labels.length ? labels.map((label) => totals[label]) : [1],
          backgroundColor: labels.length
            ? labels.map((_, index) => CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length])
            : ['#94A3B8'],
          borderColor: '#FFFFFF',
          borderWidth: 2
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

  private renderWeeklyChart() {
    const canvas = this.weeklyChartCanvas?.nativeElement;
    const rows = this.periodTotals();
    if (!canvas) return;
    const labels = this.viewMode() === 'monthly'
      ? buildWeekLabels(weekStartIsoDate())
      : buildYearMonthLabels(this.selectedYear());
    const currencyBuckets = rows.reduce<Record<string, Record<string, number>>>((acc, row) => {
      if (!acc[row.currency]) acc[row.currency] = {};
      acc[row.currency][row.periodKey] = Number(row.total);
      return acc;
    }, {});
    const currencies = Object.keys(currencyBuckets).sort();
    const datasets = currencies.map((currency, index) => ({
      label: currency,
      data: labels.map((label) => {
        const periodKey = this.viewMode() === 'monthly'
          ? label.isoDate
          : `${this.selectedYear()}-${label.indexToken}`;
        return currencyBuckets[currency][periodKey] ?? 0;
      }),
      backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
    }));
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: labels.map((label) => label.display),
        datasets: datasets.length ? datasets : [{
          label: 'No data',
          data: labels.map(() => 0),
          backgroundColor: '#94A3B8'
        }]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = Number(context.parsed.y ?? 0);
                const currency = String(context.dataset.label ?? '');
                if (currency && currency !== 'No data') return `Total: ${this.formatMoney(currency, value)}`;
                return `Total: ${value.toLocaleString('es-CL')}`;
              }
            }
          }
        },
        scales: { y: { beginAtZero: true } }
      }
    };
    this.weeklyChart?.destroy();
    this.weeklyChart = new Chart(canvas, config);
  }

  private loadDashboard() {
    this.loading.set(true);
    this.error.set('');
    const range = this.viewMode() === 'monthly'
      ? rangeFromMonth(this.selectedMonth())
      : rangeFromYear(this.selectedYear());
    const monthForBudget = this.selectedMonth();
    const seriesRequest = this.viewMode() === 'monthly'
      ? this.api.weeklyExpensesDailyTotals(weekStartIsoDate())
      : this.api.yearlyExpensesMonthlyTotals(this.selectedYear());
    forkJoin({
      recentExpenses: this.api.recentExpenses(5),
      report: this.api.report(range.from, range.to),
      categories: this.api.categories(),
      budgets: this.api.monthlyBudgets(monthForBudget),
      periodTotals: seriesRequest,
      categoryTotals: this.api.periodExpenseCategoryTotals(range.from, range.to)
    }).subscribe({
      next: ({ recentExpenses, report, categories, budgets, periodTotals, categoryTotals }) => {
        this.recentExpenses.set(recentExpenses);
        this.report.set(report);
        this.categories.set(categories);
        this.budgets.set(budgets);
        this.periodTotals.set(periodTotals);
        this.categoryTotals.set(categoryTotals);
        this.loading.set(false);
        setTimeout(() => this.renderCharts());
      },
      error: () => {
        this.error.set('Dashboard data could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}

function rangeFromMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function rangeFromYear(year: number) {
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

function buildYearOptions() {
  const currentYear = new Date().getUTCFullYear();
  return Array.from({ length: 6 }, (_, index) => currentYear - index);
}

function weekStartIsoDate() {
  const now = new Date();
  const day = now.getUTCDay();
  const offsetToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offsetToMonday, 0, 0, 0));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
}

function buildWeekLabels(weekStartIso: string) {
  const [year, month, day] = weekStartIso.split('-').map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const labels: Array<{ display: string; isoDate: string; indexToken: string }> = [];
  for (let i = 0; i < 7; i += 1) {
    const start = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i, 0, 0, 0));
    labels.push({
      display: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(start),
      isoDate: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`,
      indexToken: ''
    });
  }
  return labels;
}

function buildYearMonthLabels(year: number) {
  return Array.from({ length: 12 }, (_, index) => ({
    display: new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(Date.UTC(year, index, 1))),
    isoDate: '',
    indexToken: String(index + 1).padStart(2, '0')
  }));
}

const CHART_COLORS = ['#0B1F3A', '#1D4ED8', '#12355B', '#334155', '#64748B', '#94A3B8'];
const CATEGORY_CHART_COLORS = [
  '#0B1F3A',
  '#1D4ED8',
  '#0F766E',
  '#B45309',
  '#7C2D12',
  '#6D28D9',
  '#BE123C',
  '#0369A1',
  '#15803D',
  '#9333EA',
  '#C2410C',
  '#475569'
];
