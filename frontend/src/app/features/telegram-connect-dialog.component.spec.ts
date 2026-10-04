import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { I18nService } from '../core/i18n.service';
import { TelegramConnectDialogComponent } from './telegram-connect-dialog.component';

describe('TelegramConnectDialogComponent', () => {
  let fixture: ComponentFixture<TelegramConnectDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<TelegramConnectDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<TelegramConnectDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [TelegramConnectDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { botUrl: 'https://t.me/expenses_tracker_bot' } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: I18nService, useValue: { t: (key: string) => key } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TelegramConnectDialogComponent);
    fixture.detectChanges();
  });

  it('expone un título, controles de cierre y una acción de Telegram independientes', () => {
    const host: HTMLElement = fixture.nativeElement;
    const title = host.querySelector('[mat-dialog-title]');
    const content = host.querySelector('[mat-dialog-content]');
    const close = host.querySelector<HTMLButtonElement>('button[aria-label="common_close"]');
    const openTelegram = host.querySelector<HTMLAnchorElement>('a[href="https://t.me/expenses_tracker_bot"]');

    expect(title?.textContent).toContain('dashboard_telegram_modal_title');
    expect(content?.textContent).toContain('dashboard_telegram_modal_intro');
    expect(close).not.toBeNull();
    expect(openTelegram?.textContent).toContain('dashboard_telegram_open_bot');

    close?.click();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
