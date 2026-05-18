import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService, type Category } from '../core/api.service';
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
    <app-page-header title="Categories" eyebrow="Organize expenses with main categories and subcategories"></app-page-header>

    <section class="grid gap-4 lg:grid-cols-2">
      <mat-card class="page-panel p-2">
        <mat-accordion>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>Create main category</mat-panel-title>
            </mat-expansion-panel-header>
        <form [formGroup]="mainForm" (ngSubmit)="saveMain()" class="grid gap-4 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>
          <div class="mobile-stack-actions flex items-center">
            <button mat-flat-button color="primary" type="submit" [disabled]="mainForm.invalid || saving()">Add</button>
          </div>
        </form>
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>

      <mat-card class="page-panel p-2">
        <mat-accordion>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>Create subcategory</mat-panel-title>
            </mat-expansion-panel-header>
        <form [formGroup]="subForm" (ngSubmit)="saveSubcategory()" class="grid gap-4 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <mat-form-field appearance="outline">
            <mat-label>Parent</mat-label>
            <mat-select formControlName="parentId">
              @for (category of rootCategories(); track category.id) {
                <mat-option [value]="category.id">{{ category.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>
          <div class="mobile-stack-actions flex items-center">
            <button mat-flat-button color="primary" type="submit" [disabled]="subForm.invalid || saving()">Add</button>
          </div>
        </form>
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>
    </section>

    <div class="mt-4">
      <app-feedback-banner [message]="message()" tone="success" />
    </div>

    <mat-card class="page-panel mt-4 p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Category library</h2>
        <span class="text-sm text-brand-muted">{{ categories().length }} categories</span>
      </div>
      <app-feedback-banner [message]="error()" tone="error" />
      <app-feedback-banner [message]="loading() ? 'Loading categories...' : ''" tone="info" />

      @if (rootCategories().length) {
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (category of rootCategories(); track category.id) {
            <div class="rounded border border-brand-border bg-brand-surface p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="font-semibold">{{ category.name }}</h3>
                  <div class="mt-1 text-xs text-brand-muted">{{ category.isDefault ? 'Default' : 'Custom' }}</div>
                </div>
                <span class="rounded bg-brand-surface-muted px-2 py-1 text-xs text-brand-muted">{{ subcategories(category.id).length }} sub</span>
              </div>

              @if (subcategories(category.id).length) {
                <div class="mt-4 grid gap-2">
                  @for (subcategory of subcategories(category.id); track subcategory.id) {
                    <div class="grid gap-1 rounded border border-brand-border/70 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span>{{ subcategory.name }}</span>
                      <span class="text-xs text-brand-muted">{{ subcategory.isDefault ? 'Default' : 'Custom' }}</span>
                    </div>
                  }
                </div>
              } @else {
                <p class="mt-4 text-sm text-brand-muted">No subcategories yet.</p>
              }
            </div>
          }
        </div>
      } @else {
        <app-empty-state message="No categories found. Create a main category to get started." />
      }
    </mat-card>
  `
})
export class CategoriesComponent {
  private readonly fb = inject(FormBuilder);
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
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load categories.');
      }
    });
  }

  saveMain() {
    const value = this.mainForm.getRawValue();
    this.createCategory({ name: value.name }, () => this.mainForm.reset({ name: '' }), 'Main category created.');
  }

  saveSubcategory() {
    const value = this.subForm.getRawValue();
    this.createCategory(
      { name: value.name, parentId: value.parentId },
      () => this.subForm.patchValue({ name: '' }),
      'Subcategory created.'
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
        this.message.set('Could not create category.');
      }
    });
  }
}
