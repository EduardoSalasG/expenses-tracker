import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService, type Category } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatExpansionModule,
    EmptyStateComponent,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header [title]="t('categories_title')" [eyebrow]="t('categories_subtitle')"></app-page-header>

    <section class="grid gap-4 lg:grid-cols-2">
      <mat-card id="categories-main-panel" class="page-panel p-2">
        <mat-accordion>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>{{ t('categories_create_main') }}</mat-panel-title>
            </mat-expansion-panel-header>
        <form [formGroup]="mainForm" (ngSubmit)="saveMain()" class="grid gap-4 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <mat-form-field appearance="outline">
            <mat-label>{{ t('categories_name') }}</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>
          <div class="mobile-stack-actions flex items-center">
            <button mat-flat-button color="primary" type="submit" [disabled]="mainForm.invalid || saving()">{{ t('categories_add') }}</button>
          </div>
        </form>
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>

      <mat-card id="categories-sub-panel" class="page-panel p-2">
        <mat-accordion>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>{{ t('categories_create_sub') }}</mat-panel-title>
            </mat-expansion-panel-header>
        <form [formGroup]="subForm" (ngSubmit)="saveSubcategory()" class="grid gap-4 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <mat-form-field appearance="outline">
            <mat-label>{{ t('categories_parent') }}</mat-label>
            <mat-select formControlName="parentId">
              @for (category of rootCategories(); track category.id) {
                <mat-option [value]="category.id">{{ category.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ t('categories_name') }}</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>
          <div class="mobile-stack-actions flex items-center">
            <button mat-flat-button color="primary" type="submit" [disabled]="subForm.invalid || saving()">{{ t('categories_add') }}</button>
          </div>
        </form>
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>
    </section>

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
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (category of rootCategories(); track category.id) {
            <div class="rounded border border-brand-border bg-brand-surface p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="font-semibold">{{ category.name }}</h3>
                  <div class="mt-1 text-xs text-brand-muted">{{ category.isDefault ? t('categories_default') : t('categories_custom') }}</div>
                </div>
                <span class="rounded bg-brand-surface-muted px-2 py-1 text-xs text-brand-muted">{{ subcategories(category.id).length }} {{ t('categories_sub_count') }}</span>
              </div>

              @if (subcategories(category.id).length) {
                <div class="mt-4 grid gap-2">
                  @for (subcategory of subcategories(category.id); track subcategory.id) {
                    <div class="grid gap-1 rounded border border-brand-border/70 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span>{{ subcategory.name }}</span>
                      <span class="text-xs text-brand-muted">{{ subcategory.isDefault ? t('categories_default') : t('categories_custom') }}</span>
                    </div>
                  }
                </div>
              } @else {
                <p class="mt-4 text-sm text-brand-muted">{{ t('categories_no_sub') }}</p>
              }
            </div>
          }
        </div>
      } @else {
        <app-empty-state [message]="t('categories_empty')" />
      }
    </mat-card>
  `
})
export class CategoriesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);
  private readonly onboarding = inject(OnboardingService);
  readonly t = (key: string) => this.i18n.t(key);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly message = signal('');
  readonly rootCategories = computed(() => this.categories().filter((category) => !category.parentId));
  readonly mainForm = this.fb.nonNullable.group({ name: ['', Validators.required] });
  readonly subForm = this.fb.nonNullable.group({
    parentId: ['', Validators.required],
    name: ['', Validators.required]
  });

  constructor(private readonly api: ApiService) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.categories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        const firstRoot = categories.find((category) => !category.parentId);
        if (firstRoot && !this.subForm.controls.parentId.value) {
          this.subForm.controls.parentId.setValue(firstRoot.id);
        }
        this.loading.set(false);
        setTimeout(() => this.startOnboarding(), 50);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.t('categories_load_error'));
      }
    });
  }

  saveMain() {
    const value = this.mainForm.getRawValue();
    this.createCategory({ name: value.name }, () => this.mainForm.reset({ name: '' }), this.t('categories_created_main'));
  }

  saveSubcategory() {
    const value = this.subForm.getRawValue();
    this.createCategory(
      { name: value.name, parentId: value.parentId },
      () => this.subForm.patchValue({ name: '' }),
      this.t('categories_created_sub')
    );
  }

  subcategories(parentId: string) {
    return this.categories().filter((category) => category.parentId === parentId);
  }

  private createCategory(payload: { name: string; parentId?: string }, reset: () => void, message: string) {
    this.saving.set(true);
    this.message.set('');
    this.api.createCategory(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(message);
        reset();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.message.set(this.t('categories_create_error'));
      }
    });
  }

  private startOnboarding() {
    void this.onboarding.startOnce('categories', [
      {
        element: '#categories-main-panel',
        title: this.t('onboarding_categories_title'),
        description: this.t('onboarding_categories_desc')
      },
      {
        element: '#categories-main-panel',
        title: this.t('onboarding_categories_main_title'),
        description: this.t('onboarding_categories_main_desc')
      },
      {
        element: '#categories-sub-panel',
        title: this.t('onboarding_categories_sub_title'),
        description: this.t('onboarding_categories_sub_desc')
      },
      {
        element: '#categories-library-panel',
        title: this.t('onboarding_categories_library_title'),
        description: this.t('onboarding_categories_library_desc')
      }
    ]);
  }
}
