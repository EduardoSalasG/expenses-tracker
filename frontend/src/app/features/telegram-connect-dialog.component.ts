import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../core/i18n.service';

export interface TelegramConnectDialogData {
  botUrl: string;
}

@Component({
  selector: 'app-telegram-connect-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <header class="flex items-start justify-between gap-4">
      <div>
        <h2 mat-dialog-title class="m-0 text-xl font-semibold text-brand-ink">{{ t('dashboard_telegram_modal_title') }}</h2>
        <p mat-dialog-content class="m-0 mt-2 text-sm leading-6 text-brand-muted">{{ t('dashboard_telegram_modal_intro') }}</p>
      </div>
      <button type="button" class="flex min-h-11 min-w-11 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-bg hover:text-brand-ink" (click)="close()" [attr.aria-label]="t('common_close')">
        <mat-icon aria-hidden="true" class="!h-5 !w-5">close</mat-icon>
      </button>
    </header>
    <ol class="mt-5 grid gap-3 text-sm leading-6 text-brand-muted">
      <li>1. {{ t('dashboard_telegram_step_1') }}</li>
      <li>2. {{ t('dashboard_telegram_step_2') }}</li>
      <li>3. {{ t('dashboard_telegram_step_3') }}</li>
    </ol>
    <div mat-dialog-actions class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
      <button mat-stroked-button type="button" class="!min-h-11 !border-brand-border !text-brand-ink" (click)="close()">{{ t('common_cancel') }}</button>
      <a mat-flat-button color="primary" class="!min-h-11" [href]="data.botUrl" target="_blank" rel="noopener noreferrer" (click)="close()">{{ t('dashboard_telegram_open_bot') }}</a>
    </div>
  `
})
export class TelegramConnectDialogComponent {
  readonly data = inject<TelegramConnectDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TelegramConnectDialogComponent>);
  private readonly i18n = inject(I18nService);

  t(key: string) { return this.i18n.t(key); }
  close() { this.dialogRef.close(); }
}
