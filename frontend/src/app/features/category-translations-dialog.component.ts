import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Category } from '../core/api.service';
import { I18nService } from '../core/i18n.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `<div class="brand-dialog-shell !max-h-[calc(100vh-8rem)] !p-5"><h2 mat-dialog-title>{{ t('categories_edit_names_title') }}</h2><form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4" mat-dialog-content><mat-form-field appearance="outline"><mat-label>{{ t('categories_name_es') }}</mat-label><input matInput formControlName="nameEs" required maxlength="160" /></mat-form-field><mat-form-field appearance="outline"><mat-label>{{ t('categories_name_en') }}</mat-label><input matInput formControlName="nameEn" required maxlength="160" /></mat-form-field><div mat-dialog-actions class="flex justify-end gap-2"><button mat-button type="button" (click)="ref.close()">{{ t('common_cancel') }}</button><button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">{{ t('common_save') }}</button></div></form></div>`
})
export class CategoryTranslationsDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);
  readonly ref = inject<MatDialogRef<CategoryTranslationsDialogComponent, { nameEs: string; nameEn: string }>>(MatDialogRef);
  readonly category = inject<Category>(MAT_DIALOG_DATA);
  readonly form = this.fb.nonNullable.group({ nameEs: [this.category.nameEs ?? this.category.name, Validators.required], nameEn: [this.category.nameEn ?? this.category.name, Validators.required] });
  readonly t = (key: string) => this.i18n.t(key);
  save() { if (this.form.valid) this.ref.close(this.form.getRawValue()); }
}
