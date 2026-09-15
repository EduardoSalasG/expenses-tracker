import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { type Category } from '../core/api.service';
import { categoryDisplayName } from '../core/category-label';
import { I18nService } from '../core/i18n.service';

export interface CategoryCreateDialogData {
  categories: Category[];
  parentId?: string;
}

export interface CategoryCreateDialogResult {
  name: string;
  parentId?: string;
}

@Component({
  selector: 'app-category-create-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="brand-dialog-shell !max-h-[calc(100vh-8rem)] !p-5">
      <div class="brand-dialog-header">
        <h2 id="category-create-dialog-title" class="m-0 text-xl font-semibold text-brand-ink">
          {{ t('categories_create_dialog_title') }}
        </h2>
        <p id="category-create-dialog-description" class="mt-2 text-sm leading-6 text-brand-muted">
          {{ t('categories_create_dialog_description') }}
        </p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="brand-dialog-form" aria-labelledby="category-create-dialog-title" aria-describedby="category-create-dialog-description">
        <div class="brand-dialog-fields grid gap-4">
          <div role="group" [attr.aria-label]="t('categories_create_type_label')" class="grid gap-2 sm:grid-cols-2">
            <button
              mat-stroked-button
              type="button"
              class="!min-h-11"
              [attr.aria-pressed]="form.controls.type.value === 'main'"
              [class.border-brand-blue]="form.controls.type.value === 'main'"
              (click)="selectType('main')"
            >
              {{ t('categories_create_type_main') }}
            </button>
            <button
              mat-stroked-button
              type="button"
              class="!min-h-11"
              [attr.aria-pressed]="form.controls.type.value === 'sub'"
              [class.border-brand-blue]="form.controls.type.value === 'sub'"
              (click)="selectType('sub')"
            >
              {{ t('categories_create_type_sub') }}
            </button>
          </div>

          @if (form.controls.type.value === 'sub') {
            <mat-form-field appearance="outline">
              <mat-label>{{ t('categories_parent') }}</mat-label>
              <mat-select id="category-dialog-parent" name="categoryDialogParentId" formControlName="parentId" required>
                @for (category of rootCategories(); track category.id) {
                  <mat-option [value]="category.id">{{ displayName(category) }}</mat-option>
                }
              </mat-select>
              @if (form.controls.parentId.hasError('required')) {
                <mat-error>{{ t('categories_parent_required') }}</mat-error>
              }
            </mat-form-field>
          }

          <mat-form-field appearance="outline">
            <mat-label>{{ t('categories_name') }}</mat-label>
            <input matInput id="category-dialog-name" name="categoryDialogName" formControlName="name" required />
          </mat-form-field>
        </div>

        <div class="brand-dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button mat-button type="button" class="!min-h-11" (click)="dialogRef.close()">{{ t('common_cancel') }}</button>
          <button mat-flat-button color="primary" type="submit" class="!min-h-11" [disabled]="form.invalid">
            {{ t('categories_create_action') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class CategoryCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);
  readonly dialogRef = inject<MatDialogRef<CategoryCreateDialogComponent, CategoryCreateDialogResult | undefined>>(MatDialogRef);
  readonly data = inject<CategoryCreateDialogData>(MAT_DIALOG_DATA);
  readonly rootCategories = computed(() => this.data.categories.filter((category) => !category.parentId));
  readonly form = this.fb.nonNullable.group({
    type: [this.data.parentId ? 'sub' as const : 'main' as const, Validators.required],
    parentId: [this.data.parentId ?? ''],
    name: ['', Validators.required]
  });

  constructor() {
    this.updateParentRequirement();
    this.form.controls.type.valueChanges.subscribe(() => this.updateParentRequirement());
  }

  t(key: string) {
    return this.i18n.t(key);
  }

  displayName(category: Category) {
    return categoryDisplayName(this.i18n.language(), category);
  }

  selectType(type: 'main' | 'sub') {
    this.form.controls.type.setValue(type);
  }

  submit() {
    if (this.form.invalid) return;
    const { type, parentId, name } = this.form.getRawValue();
    const trimmedName = name.trim();
    if (!trimmedName || (type === 'sub' && !parentId)) return;
    this.dialogRef.close(type === 'sub' ? { name: trimmedName, parentId } : { name: trimmedName });
  }

  private updateParentRequirement() {
    const parentControl = this.form.controls.parentId;
    parentControl.setValidators(this.form.controls.type.value === 'sub' ? Validators.required : null);
    parentControl.updateValueAndValidity({ emitEvent: false });
  }
}
