import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiService, type Category } from '../core/api.service';
import { CategoryCreateDialogComponent, type CategoryCreateDialogResult } from './category-create-dialog.component';
import { AccountContextService } from '../core/account-context.service';
import { categoryDisplayName } from '../core/category-label';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatExpansionModule,
    EmptyStateComponent,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header [title]="t('categories_title')" [eyebrow]="t('categories_subtitle')">
      <button id="categories-create-action" mat-flat-button color="primary" type="button" class="!min-h-11" (click)="openCreateDialog()">
        {{ t('categories_new') }}
      </button>
    </app-page-header>

    <div class="mt-4">
      <app-feedback-banner [message]="message()" tone="success" />
    </div>

    <mat-card id="categories-library-panel" class="page-panel mt-4 p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">{{ t('categories_library') }}</h2>
        <span class="text-sm text-brand-muted">{{ categories().length }} {{ t('categories_count') }}</span>
      </div>
      <app-feedback-banner [message]="error()" tone="error" />
      <app-feedback-banner [message]="loading() ? t('categories_loading') : ''" tone="info" />

      @if (rootCategories().length) {
        <div class="grid gap-3 border-b border-brand-border pb-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ t('categories_search') }}</mat-label>
            <input matInput type="search" [value]="searchTerm()" (input)="setSearchTerm($event)" [attr.aria-label]="t('categories_search')">
          </mat-form-field>
          <div class="flex flex-wrap gap-2" role="group" [attr.aria-label]="t('categories_filter_label')">
            @for (filter of libraryFilters; track filter) {
              <button mat-stroked-button type="button" [attr.aria-pressed]="libraryFilter() === filter" (click)="setLibraryFilter(filter)">
                {{ t('categories_filter_' + filter) }}
              </button>
            }
          </div>
        </div>

        @if (visibleRootCategories().length) {
          <mat-accordion class="mt-4 grid gap-3">
            @for (category of visibleRootCategories(); track category.id) {
              <mat-expansion-panel>
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ displayName(category) }}</mat-panel-title>
                  <mat-panel-description>{{ category.isDefault ? t('categories_default') : t('categories_custom') }} · {{ subcategories(category.id).length }} {{ t('categories_sub_count') }}</mat-panel-description>
                </mat-expansion-panel-header>
                <div class="grid gap-3 p-1">
                  <div class="text-sm text-brand-muted">
                    {{ t('categories_monthly_activity') }}: {{ activityLabel(category.id) }}
                  </div>
                  <div>
                    <button mat-stroked-button type="button" class="!min-h-11" (click)="openCreateDialog(category.id)">
                      {{ t('categories_add_subcategory') }}
                    </button>
                  </div>
                  @if (visibleSubcategories(category.id).length) {
                    <div class="grid gap-2">
                      @for (subcategory of visibleSubcategories(category.id); track subcategory.id) {
                        <div class="grid gap-1 rounded border border-brand-border/70 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                          <span>{{ displayName(subcategory) }}</span>
                          <span class="text-xs text-brand-muted">{{ subcategory.isDefault ? t('categories_default') : t('categories_custom') }}</span>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-sm text-brand-muted">{{ t('categories_no_sub') }}</p>
                  }
                </div>
              </mat-expansion-panel>
            }
          </mat-accordion>
        } @else {
          <app-empty-state [message]="t('categories_no_results')" />
        }
      } @else {
        <app-empty-state [message]="t('categories_empty')" />
      }
    </mat-card>
  `
})
export class CategoriesComponent {
  private readonly i18n = inject(I18nService);
  private readonly onboarding = inject(OnboardingService);
  private readonly accountService = inject(AccountContextService);
  private readonly dialog = inject(MatDialog);
  readonly t = (key: string) => this.i18n.t(key);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly message = signal('');
  readonly searchTerm = signal('');
  readonly libraryFilter = signal<'all' | 'default' | 'custom'>('all');
  readonly libraryFilters: Array<'all' | 'default' | 'custom'> = ['all', 'default', 'custom'];
  readonly activityTotals = signal<Array<{ categoryId: string; subcategoryId?: string; currency: string; total: number }>>([]);
  private loadRequestId = 0;
  readonly rootCategories = computed(() => this.categories().filter((category) => !category.parentId));
  readonly visibleRootCategories = computed(() => this.rootCategories().filter((category) => this.matchesLibrary(category)));
  private readonly monthlyActivityByRoot = computed(() => {
    const categories = this.categories();
    const totals = new Map<string, Map<string, number>>();

    for (const item of this.activityTotals()) {
      const matchedCategory = categories.find((category) => category.id === (item.subcategoryId ?? item.categoryId));
      const rootId = matchedCategory?.parentId ?? matchedCategory?.id ?? item.categoryId;
      const totalsByCurrency = totals.get(rootId) ?? new Map<string, number>();
      totalsByCurrency.set(item.currency, (totalsByCurrency.get(item.currency) ?? 0) + Number(item.total));
      totals.set(rootId, totalsByCurrency);
    }

    return totals;
  });

  constructor(private readonly api: ApiService) {
    effect(() => {
      const currentAccountId = this.accountService.activeAccountId();
      const accountLoading = this.accountService.loading();
      if (!currentAccountId || accountLoading) return;
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const requestedAccountId = this.accountService.activeAccountId();
    const requestId = ++this.loadRequestId;
    if (!requestedAccountId) {
      this.loading.set(false);
      return;
    }
    const currentMonth = monthRange(new Date());
    forkJoin({
      categories: this.api.categories(),
      activityTotals: this.api.periodExpenseCategoryTotals(currentMonth.from, currentMonth.to).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ categories, activityTotals }) => {
        if (requestId !== this.loadRequestId || requestedAccountId !== this.accountService.activeAccountId()) return;
        this.categories.set(categories);
        this.activityTotals.set(activityTotals);
        this.loading.set(false);
        setTimeout(() => this.startOnboarding(), 50);
      },
      error: () => {
        if (requestId !== this.loadRequestId || requestedAccountId !== this.accountService.activeAccountId()) return;
        this.loading.set(false);
        this.error.set(this.t('categories_load_error'));
      }
    });
  }

  openCreateDialog(parentId?: string) {
    const dialogRef = this.dialog.open(CategoryCreateDialogComponent, {
      width: 'min(520px, calc(100vw - 1.5rem))',
      maxWidth: 'calc(100vw - 1.5rem)',
      panelClass: 'brand-dialog-panel',
      autoFocus: false,
      data: { categories: this.categories(), parentId }
    });

    dialogRef.afterClosed().subscribe((result: CategoryCreateDialogResult | undefined) => {
      if (!result) return;
      this.createCategory(
        result,
        () => undefined,
        this.t(result.parentId ? 'categories_created_sub' : 'categories_created_main')
      );
    });
  }

  subcategories(parentId: string) {
    return this.categories().filter((category) => category.parentId === parentId);
  }

  visibleSubcategories(parentId: string) {
    const root = this.categories().find((category) => category.id === parentId);
    const search = normalizedSearch(this.searchTerm());
    const rootMatchesSearch = this.categoryMatchesSearch(root, search);
    return this.subcategories(parentId).filter((category) =>
      this.matchesLibraryFilter(category) && (!search || rootMatchesSearch || this.categoryMatchesSearch(category, search))
    );
  }

  setLibraryFilter(filter: 'all' | 'default' | 'custom') {
    this.libraryFilter.set(filter);
  }

  setSearchTerm(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  activityLabel(rootCategoryId: string) {
    const totalsByCurrency = this.monthlyActivityByRoot().get(rootCategoryId);
    if (!totalsByCurrency?.size) return this.t('categories_no_activity');
    return [...totalsByCurrency.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, total]) => this.formatMoney(currency, total))
      .join(' | ');
  }

  displayName(category: Category) {
    return categoryDisplayName(this.i18n.language(), category);
  }

  private matchesLibrary(category: Category) {
    const search = normalizedSearch(this.searchTerm());
    return [category, ...this.subcategories(category.id)].some((candidate) =>
      this.matchesLibraryFilter(candidate) && (!search || this.categoryMatchesSearch(candidate, search))
    );
  }

  private matchesLibraryFilter(category: Category) {
    const filter = this.libraryFilter();
    return filter === 'all' || (filter === 'default' ? category.isDefault : !category.isDefault);
  }

  private categoryMatchesSearch(category: Category | undefined, search: string) {
    return Boolean(category && normalizedSearch(this.displayName(category)).includes(search));
  }

  private formatMoney(currency: string, amount: number) {
    if (currency.toUpperCase() === 'CLP') return `$${Number(amount).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number(amount));
  }

  private createCategory(payload: { name: string; parentId?: string }, reset: () => void, message: string) {
    this.saving.set(true);
    this.message.set('');
    const knownCategoryIds = new Set(this.categories().map((category) => category.id));
    const requestedAccountId = this.accountService.activeAccountId();
    this.api.createCategory(payload).subscribe({
      next: () => {
        this.completeCategoryCreation(reset, message);
      },
      error: () => {
        this.api.categories().subscribe({
          next: (categories) => {
            const created = categories.find((category) =>
              !knownCategoryIds.has(category.id) &&
              normalizedName(category.name) === normalizedName(payload.name) &&
              (category.parentId ?? undefined) === (payload.parentId ?? undefined)
            );

            if (created && requestedAccountId === this.accountService.activeAccountId()) {
              this.categories.set(categories);
              this.completeCategoryCreation(reset, message, false);
              return;
            }

            this.completeCategoryCreationError();
          },
          error: () => this.completeCategoryCreationError()
        });
      }
    });
  }

  private completeCategoryCreation(reset: () => void, message: string, reload = true) {
    this.saving.set(false);
    this.message.set(message);
    reset();
    if (reload) this.load();
  }

  private completeCategoryCreationError() {
    this.saving.set(false);
    this.message.set(this.t('categories_create_error'));
  }

  private startOnboarding() {
    void this.onboarding.startOnce('categories', [
      {
        element: '#categories-create-action',
        title: this.t('onboarding_categories_title'),
        description: this.t('onboarding_categories_desc')
      },
      {
        element: '#categories-library-panel',
        title: this.t('onboarding_categories_library_title'),
        description: this.t('onboarding_categories_library_desc')
      }
    ]);
  }
}

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function normalizedSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function monthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    from: toDateValue(new Date(year, month, 1)),
    to: toDateValue(new Date(year, month + 1, 0))
  };
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
