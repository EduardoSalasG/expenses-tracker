import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Chart, type ChartConfiguration, type TooltipItem, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { ApiService, type Category, type CurrentUser, type Expense, type MonthlyBudget, type Report } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { PeriodStateService } from '../core/period-state.service';

Chart.register(...registerables);

const chartAreaBackgroundPlugin = {
  id: 'chartAreaBackground',
  beforeDraw: (chart: Chart, _args: unknown, pluginOptions: unknown) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const color = (pluginOptions as { color?: string } | undefined)?.color;
    if (!color) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
    ctx.restore();
  }
};

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
  imports: [MatCardModule, MatProgressBarModule, MatButtonModule, MatIconModule],
  template: `
    @if (showTelegramBanner()) {
      <section class="mb-4">
        <div
          class="flex w-full items-start justify-between gap-4 rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-left shadow-sm transition-colors hover:bg-brand-surface-muted"
          role="button"
          tabindex="0"
          (click)="openTelegramModal()"
          (keydown.enter)="openTelegramModal()"
          (keydown.space)="openTelegramModal()"
        >
          <div class="min-w-0">
            <div class="text-sm font-semibold text-brand-ink">{{ t('dashboard_telegram_banner_title') }}</div>
            <div class="mt-1 text-sm text-brand-muted">{{ t('dashboard_telegram_banner_desc') }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-brand-blue">{{ t('dashboard_telegram_banner_cta') }}</span>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-bg hover:text-brand-ink"
              (click)="dismissTelegramBanner($event)"
              [attr.aria-label]="t('common_close')"
            >
              <mat-icon class="!h-5 !w-5">close</mat-icon>
            </button>
          </div>
        </div>
      </section>
    }

    <div class="mb-5 flex flex-col gap-4 border-b border-brand-border pb-5 sm:mb-6 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-brand-muted sm:text-sm">{{ periodLabel() }}</p>
        <h1 class="mt-1 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ t('dashboard_title') }}</h1>
      </div>
      <div class="grid gap-3 sm:grid-cols-[auto_auto] sm:items-center lg:flex lg:flex-wrap">
        <div class="grid grid-cols-2 overflow-hidden rounded border border-brand-border bg-brand-surface text-sm sm:inline-grid" role="group" aria-label="Dashboard period">
          <button
            mat-button
            type="button"
            [class]="periodButtonClasses('monthly')"
            [attr.aria-pressed]="viewMode() === 'monthly'"
            (click)="setViewMode('monthly')"
          >
            {{ t('dashboard_monthly') }}
          </button>
          <button
            mat-button
            type="button"
            [class]="periodButtonClasses('yearly')"
            [attr.aria-pressed]="viewMode() === 'yearly'"
            (click)="setViewMode('yearly')"
          >
            {{ t('dashboard_annual') }}
          </button>
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
          {{ t('dashboard_net_balance') }} <strong class="ml-2 text-brand-ink">{{ netBalanceLabel() }}</strong>
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
      <mat-card class="border p-4 text-[var(--semantic-danger-text)] border-[var(--semantic-danger-border)] bg-[var(--semantic-danger-bg)]">{{ error() }}</mat-card>
    } @else {
      <section class="grid gap-4 lg:grid-cols-3">
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-brand-muted">{{ viewMode() === 'monthly' ? t('dashboard_this_month_expenses') : t('dashboard_this_year_expenses') }}</div>
          <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ expenseTotalLabel() }}</div>
          <div class="mt-3 text-sm text-brand-muted">{{ report()?.expenses?.length ?? 0 }} {{ t('dashboard_expense_records') }}</div>
        </mat-card>
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-brand-muted">{{ viewMode() === 'monthly' ? t('dashboard_this_month_income') : t('dashboard_this_year_income') }}</div>
          <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ incomeTotalLabel() }}</div>
          <div class="mt-3 text-sm text-brand-muted">{{ report()?.incomes?.length ?? 0 }} {{ t('dashboard_income_records') }}</div>
        </mat-card>
        <mat-card class="page-panel p-5">
          <div class="text-sm font-medium text-brand-muted">{{ t('dashboard_budget_progress') }}</div>
          @if (overallBudget()) {
            <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ overallBudget()?.progress }}%</div>
            <mat-progress-bar class="mt-4" mode="determinate" [value]="overallBudget()?.progress ?? 0" />
            <div class="mt-3 text-sm text-brand-muted">{{ overallBudget()?.spentLabel }} {{ t('dashboard_spent_of') }} {{ overallBudget()?.amountLabel }}</div>
          } @else {
            <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ t('dashboard_no_budget') }}</div>
            <div class="mt-3 text-sm text-brand-muted">{{ t('dashboard_create_budgets_hint') }}</div>
          }
        </mat-card>
      </section>

      <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <mat-card class="page-panel chart-panel p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ t('dashboard_cash_flow_currency') }}</h2>
          </div>
          <div class="h-64 sm:h-72">
            <canvas #currencyChart aria-label="Cash flow by currency chart"></canvas>
          </div>
        </mat-card>

        <mat-card class="page-panel chart-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">{{ t('dashboard_expenses_by_category') }}</h2>
          <div class="h-64 sm:h-72">
            <canvas #categoryChart aria-label="Expenses by category chart"></canvas>
          </div>
        </mat-card>
      </section>

      <section class="mt-4">
        <mat-card class="page-panel chart-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">
            {{ viewMode() === 'monthly' ? t('dashboard_week_expenses') : t('dashboard_year_expenses_by_month') }}
          </h2>
          <div class="h-64 sm:h-72">
            <canvas #weeklyChart aria-label="Weekly expenses chart"></canvas>
          </div>
        </mat-card>
      </section>

      <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">{{ t('dashboard_recent_expenses') }}</h2>
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
              <p class="text-brand-muted">{{ t('dashboard_no_expenses') }}</p>
            }
          </div>
        </mat-card>

        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">{{ t('dashboard_monthly_budgets') }}</h2>
          <div class="grid gap-4">
            @for (budget of budgetProgress(); track budget.label + budget.currency) {
              <div>
                <div class="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span class="font-medium">{{ budget.label }}</span>
                  <span class="text-brand-muted">{{ formatMoney(budget.currency, budget.remaining) }} {{ t('dashboard_left') }}</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="budget.progress" />
                <div class="mt-1 text-xs text-brand-muted">
                  {{ formatMoney(budget.currency, budget.spent) }} {{ t('dashboard_spent_of') }} {{ formatMoney(budget.currency, budget.amount) }}
                </div>
              </div>
            } @empty {
              <p class="text-brand-muted">{{ t('dashboard_no_budgets_month') }}</p>
            }
          </div>
        </mat-card>
      </section>

      <section class="mt-4">
        <mat-card class="page-panel p-5">
          <h2 class="mb-3 text-lg font-semibold">{{ t('dashboard_category_variation_prev') }}</h2>
          <div class="grid gap-2">
            @for (row of categoryVariation(); track row.categoryId + row.currency) {
              <div class="grid gap-2 border-b border-brand-border/70 py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ row.categoryName }} ({{ row.currency }})</div>
                  <div class="mt-1 text-sm text-brand-muted">
                    {{ t('dashboard_current_vs_previous') }} {{ formatMoney(row.currency, row.currentTotal) }} {{ t('dashboard_vs_previous') }} {{ formatMoney(row.currency, row.previousTotal) }}
                  </div>
                </div>
                <div
                  class="text-left sm:text-right"
                  [style.color]="row.delta > 0 ? 'var(--semantic-danger-text)' : row.delta < 0 ? 'var(--semantic-success-text)' : 'var(--brand-muted)'"
                >
                  <div class="font-semibold">
                    {{ row.delta > 0 ? '+' : row.delta < 0 ? '-' : '' }}{{ formatMoney(row.currency, abs(row.delta)) }}
                  </div>
                  <div class="text-xs">
                    {{ row.deltaPercent === null ? t('dashboard_na') : (abs(row.deltaPercent).toFixed(2) + '%') }}
                  </div>
                </div>
              </div>
            } @empty {
              <p class="text-brand-muted">{{ t('dashboard_no_variation') }}</p>
            }
          </div>
        </mat-card>
      </section>
    }

    @if (telegramModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/70 px-4 py-6">
        <div class="w-full max-w-md rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-brand-ink">{{ t('dashboard_telegram_modal_title') }}</h2>
              <p class="mt-2 text-sm leading-6 text-brand-muted">{{ t('dashboard_telegram_modal_intro') }}</p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-bg hover:text-brand-ink"
              (click)="closeTelegramModal()"
              [attr.aria-label]="t('common_close')"
            >
              <mat-icon class="!h-5 !w-5">close</mat-icon>
            </button>
          </div>
          <ol class="mt-5 grid gap-3 text-sm leading-6 text-brand-muted">
            <li>1. {{ t('dashboard_telegram_step_1') }}</li>
            <li>2. {{ t('dashboard_telegram_step_2') }}</li>
            <li>3. {{ t('dashboard_telegram_step_3') }}</li>
          </ol>
          <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button mat-stroked-button type="button" class="!h-11 !border-brand-border !text-brand-ink" (click)="closeTelegramModal()">
              {{ t('common_cancel') }}
            </button>
            <a
              mat-flat-button
              color="primary"
              class="!h-11"
              [href]="telegramBotUrl()"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t('dashboard_telegram_open_bot') }}
            </a>
          </div>
        </div>
      </div>
    }

    @if (telegramDismissModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/70 px-4 py-6">
        <div class="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-2xl">
          <h2 class="text-lg font-semibold text-brand-ink">{{ t('dashboard_telegram_dismiss_title') }}</h2>
          <p class="mt-3 text-sm leading-6 text-brand-muted">{{ t('dashboard_telegram_dismiss_desc') }}</p>
          <div class="mt-6 flex justify-end">
            <button mat-flat-button color="primary" type="button" class="!h-11" (click)="closeTelegramDismissModal()">
              {{ t('common_close') }}
            </button>
          </div>
        </div>
      </div>
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
  readonly user = signal<CurrentUser | null>(null);
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
      return new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
    }
    return `${this.selectedYear()}`;
  });
  readonly expenseTotalLabel = computed(() => this.formatTotals(this.report()?.expenseTotalsByCurrency));
  readonly incomeTotalLabel = computed(() => this.formatTotals(this.report()?.incomeTotalsByCurrency));
  readonly netBalanceLabel = computed(() => {
    const report = this.report();
    if (!report) return '-';
    const currencies = new Set([...Object.keys(report.expenseTotalsByCurrency), ...Object.keys(report.incomeTotalsByCurrency)]);
    if (!currencies.size) return this.t('dashboard_no_movement');
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
  readonly showTelegramBanner = computed(() => {
    const user = this.user();
    if (!user || user.telegramChatId) return false;
    return !localStorage.getItem(`telegram_banner_dismissed_${user.id}`);
  });
  readonly telegramBotUrl = signal('https://t.me/');
  readonly telegramModalOpen = signal(false);
  readonly telegramDismissModalOpen = signal(false);

  private currencyChart?: Chart;
  private categoryChart?: Chart;
  private weeklyChart?: Chart;
  private viewReady = false;
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor(
    private readonly api: ApiService,
    private readonly i18n: I18nService,
    private readonly periodState: PeriodStateService
  ) {}

  ngOnInit() {
    this.selectedMonth.set(this.periodState.selectedMonth());
    this.selectedYear.set(Number(this.selectedMonth().slice(0, 4)));
    this.mediaQuery.addEventListener('change', this.handleThemeChange);
    this.loadDashboard();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy() {
    this.mediaQuery.removeEventListener('change', this.handleThemeChange);
    this.currencyChart?.destroy();
    this.categoryChart?.destroy();
    this.weeklyChart?.destroy();
  }

  setViewMode(mode: 'monthly' | 'yearly') {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.loadDashboard();
  }

  periodButtonClasses(mode: 'monthly' | 'yearly') {
    const base = '!min-w-0 !rounded-none !border-0';
    if (this.viewMode() === mode) {
      return `${base} !bg-brand-blue !text-white`;
    }
    return `${base} !text-brand-ink hover:!bg-brand-surface-muted`;
  }

  changeMonth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value || value === this.selectedMonth()) return;
    this.selectedMonth.set(value);
    this.periodState.setSelectedMonth(value);
    this.selectedYear.set(Number(value.slice(0, 4)));
    this.loadDashboard();
  }

  changeYear(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!value || value === this.selectedYear()) return;
    this.selectedYear.set(value);
    this.loadDashboard();
  }

  openTelegramModal() {
    this.telegramModalOpen.set(true);
  }

  closeTelegramModal() {
    this.telegramModalOpen.set(false);
  }

  dismissTelegramBanner(event: Event) {
    event.stopPropagation();
    const user = this.user();
    if (user) {
      localStorage.setItem(`telegram_banner_dismissed_${user.id}`, 'true');
    }
    this.telegramDismissModalOpen.set(true);
  }

  closeTelegramDismissModal() {
    this.telegramDismissModalOpen.set(false);
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
    return new Intl.DateTimeFormat(this.locale(), { month: 'short', day: 'numeric' }).format(new Date(value));
  }

  formatMoney(currency: string, amount: number) {
    const locale = this.locale();
    if (currency.toUpperCase() === 'CLP') {
      return `$${Number(amount).toLocaleString(locale === 'es-CL' ? 'es-CL' : 'en-US', { maximumFractionDigits: 0 })}`;
    }
    return new Intl.NumberFormat(locale === 'es-CL' ? 'es-CL' : 'en-US', { style: 'currency', currency }).format(Number(amount));
  }

  abs(value: number) {
    return Math.abs(value);
  }

  private formatTotals(totals?: Record<string, number>) {
    if (!totals || !Object.keys(totals).length) return this.t('dashboard_no_movement');
    return Object.entries(totals)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, amount]) => this.formatMoney(currency, amount))
      .join(' | ');
  }

  private buildBudgetProgress(): BudgetProgressRow[] {
    const expenses = this.report()?.expenses ?? [];
    return this.budgets().map((budget) => {
      const spent = expenses
        .filter((expense) => this.matchesBudget(expense, budget))
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

  private matchesBudget(expense: Expense, budget: MonthlyBudget) {
    if (expense.currency !== budget.currency) return false;

    if (budget.subcategoryId) {
      return expense.subcategoryId === budget.subcategoryId || expense.categoryId === budget.subcategoryId;
    }

    if (expense.categoryId === budget.categoryId || expense.subcategoryId === budget.categoryId) {
      return true;
    }

    const category = this.categories().find((item) => item.id === expense.categoryId);
    return category?.parentId === budget.categoryId;
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
    this.applyChartDefaults();
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
      plugins: [chartAreaBackgroundPlugin],
      data: {
        labels: currencies.length ? currencies : ['No data'],
        datasets: [
          {
            label: 'Income',
            data: currencies.map((currency) => report.incomeTotalsByCurrency[currency] ?? 0),
            backgroundColor: this.chartColors().income
          },
          {
            label: 'Expenses',
            data: currencies.map((currency) => report.expenseTotalsByCurrency[currency] ?? 0),
            backgroundColor: this.chartColors().expense
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: this.chartColors().text, boxWidth: 14, usePointStyle: true } },
          chartAreaBackground: { color: this.chartColors().surfaceMuted }
        } as never,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: this.chartColors().text, font: { weight: 600 } },
            grid: { color: this.chartColors().grid }
          },
          x: {
            ticks: { color: this.chartColors().text, font: { weight: 600 } },
            grid: { color: this.chartColors().grid }
          }
        }
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
      plugins: [chartAreaBackgroundPlugin],
      data: {
        labels: labels.length ? labels : ['No expenses'],
        datasets: [{
          data: labels.length ? labels.map((label) => totals[label]) : [1],
          backgroundColor: labels.length
            ? labels.map((_, index) => this.chartColors().categoryPalette[index % this.chartColors().categoryPalette.length])
            : ['#94A3B8'],
          borderColor: this.chartColors().surface,
          borderWidth: 2
        }]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: this.chartColors().text, boxWidth: 14, usePointStyle: true } },
          chartAreaBackground: { color: this.chartColors().surfaceMuted }
        } as never
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
      ? buildWeekLabels(weekStartIsoDate(), this.locale())
      : buildYearMonthLabels(this.selectedYear(), this.locale());
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
      backgroundColor: this.chartColors().seriesPalette[index % this.chartColors().seriesPalette.length]
    }));
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      plugins: [chartAreaBackgroundPlugin],
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
          legend: { display: true, position: 'bottom', labels: { color: this.chartColors().text, boxWidth: 14, usePointStyle: true } },
          chartAreaBackground: { color: this.chartColors().surfaceMuted },
          tooltip: {
            backgroundColor: this.chartColors().surface,
            titleColor: this.chartColors().text,
            bodyColor: this.chartColors().text,
            borderColor: this.chartColors().grid,
            borderWidth: 1,
            callbacks: {
              label: (context: TooltipItem<'bar'>) => {
                const value = Number(context.parsed.y ?? 0);
                const currency = String(context.dataset.label ?? '');
                if (currency && currency !== 'No data') return `Total: ${this.formatMoney(currency, value)}`;
                return `Total: ${value.toLocaleString('es-CL')}`;
              }
            }
          }
        } as never,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: this.chartColors().text, font: { weight: 600 } },
            grid: { color: this.chartColors().grid }
          },
          x: {
            ticks: { color: this.chartColors().text, font: { weight: 600 } },
            grid: { color: this.chartColors().grid }
          }
        }
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
    const seriesRequest = this.viewMode() === 'monthly'
      ? this.api.weeklyExpensesDailyTotals(weekStartIsoDate())
      : this.api.yearlyExpensesMonthlyTotals(this.selectedYear());
    forkJoin({
      user: this.api.me(),
      recentExpenses: this.api.recentExpenses(5),
      report: this.api.report(range.from, range.to),
      categories: this.api.categories(),
      budgets: this.api.monthlyBudgets(),
      periodTotals: seriesRequest,
      categoryTotals: this.api.periodExpenseCategoryTotals(range.from, range.to)
    }).subscribe({
      next: ({ user, recentExpenses, report, categories, budgets, periodTotals, categoryTotals }) => {
        this.user.set(user);
        this.recentExpenses.set(recentExpenses);
        this.report.set(report);
        this.categories.set(categories);
        this.budgets.set(budgets);
        this.periodTotals.set(periodTotals);
        this.categoryTotals.set(categoryTotals);
        this.loading.set(false);
        if (!user.telegramChatId) {
          this.api.createTelegramRegistrationLink(user.phoneNumber).subscribe({
            next: (response) => this.telegramBotUrl.set(response.botUrl),
            error: () => this.telegramBotUrl.set('https://t.me/')
          });
        }
        setTimeout(() => this.renderCharts());
      },
      error: () => {
        this.error.set(this.t('dashboard_loading_error'));
        this.loading.set(false);
      }
    });
  }

  private readonly handleThemeChange = () => {
    this.renderCharts();
  };

  private chartColors() {
    const styles = getComputedStyle(document.documentElement);
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const seriesPalette = isDark ? DARK_SERIES_COLORS : LIGHT_SERIES_COLORS;
    const categoryPalette = isDark ? DARK_CATEGORY_COLORS : LIGHT_CATEGORY_COLORS;
    return {
      income: isDark ? '#60A5FA' : (styles.getPropertyValue('--brand-blue').trim() || '#1D4ED8'),
      expense: isDark ? '#F97316' : (styles.getPropertyValue('--brand-navy').trim() || '#0B1F3A'),
      text: isDark ? '#E2E8F0' : '#0B1F3A',
      grid: isDark ? '#334155' : '#CBD5E1',
      surface: styles.getPropertyValue('--brand-surface').trim() || '#FFFFFF',
      surfaceMuted: styles.getPropertyValue('--brand-surface-muted').trim() || '#EEF3F8',
      seriesPalette,
      categoryPalette
    };
  }

  private applyChartDefaults() {
    const colors = this.chartColors();
    Chart.defaults.color = colors.text;
    Chart.defaults.borderColor = colors.grid;
    Chart.defaults.font.family = 'Inter, Roboto, Arial, sans-serif';
    Chart.defaults.font.weight = 600;
  }

  private locale() {
    return this.i18n.language() === 'es' ? 'es-CL' : 'en-US';
  }

  t(key: string) {
    return this.i18n.t(key);
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

function buildWeekLabels(weekStartIso: string, locale: string) {
  const [year, month, day] = weekStartIso.split('-').map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const labels: Array<{ display: string; isoDate: string; indexToken: string }> = [];
  for (let i = 0; i < 7; i += 1) {
    const start = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i, 0, 0, 0));
    labels.push({
      display: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(start),
      isoDate: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`,
      indexToken: ''
    });
  }
  return labels;
}

function buildYearMonthLabels(year: number, locale: string) {
  return Array.from({ length: 12 }, (_, index) => ({
    display: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, index, 1))),
    isoDate: '',
    indexToken: String(index + 1).padStart(2, '0')
  }));
}

const LIGHT_SERIES_COLORS = ['#0B1F3A', '#1D4ED8', '#12355B', '#334155', '#64748B', '#94A3B8'];
const DARK_SERIES_COLORS = ['#38BDF8', '#F97316', '#A78BFA', '#34D399', '#FBBF24', '#FB7185'];

const LIGHT_CATEGORY_COLORS = [
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

const DARK_CATEGORY_COLORS = [
  '#38BDF8',
  '#F97316',
  '#34D399',
  '#A78BFA',
  '#FBBF24',
  '#FB7185',
  '#22D3EE',
  '#C084FC',
  '#4ADE80',
  '#F472B6',
  '#2DD4BF',
  '#FACC15'
];
