import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ApiService, type BankOption, type CurrentUser, type PaymentMethodOption, type ReportFrequency } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

const frequencies: Array<{ key: ReportFrequency; labelKey: string; descriptionKey: string }> = [
  { key: 'daily', labelKey: 'settings_frequency_daily', descriptionKey: 'settings_frequency_daily_desc' },
  { key: 'weekly', labelKey: 'settings_frequency_weekly', descriptionKey: 'settings_frequency_weekly_desc' },
  { key: 'monthly', labelKey: 'settings_frequency_monthly', descriptionKey: 'settings_frequency_monthly_desc' },
  { key: 'yearly', labelKey: 'settings_frequency_yearly', descriptionKey: 'settings_frequency_yearly_desc' }
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatIconModule,
    MatSelectModule,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header [title]="t('settings_title')" [eyebrow]="t('settings_subtitle')"></app-page-header>
    <app-feedback-banner [message]="loadError()" tone="error" />
    <app-feedback-banner [message]="loading() ? t('settings_loading') : ''" tone="info" />

    <section class="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <mat-card class="page-panel p-2">
        <mat-accordion>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>{{ t('settings_profile_panel') }}</mat-panel-title>
            </mat-expansion-panel-header>
        @if (user()) {
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="grid gap-3 p-3">
            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_first_name') }}</mat-label>
              <input matInput formControlName="firstName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_last_name') }}</mat-label>
              <input matInput formControlName="lastName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_preferred_name') }}</mat-label>
              <input matInput formControlName="preferredName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_phone') }}</mat-label>
              <input matInput [value]="user()?.phoneNumber" disabled />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_email') }}</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_country') }}</mat-label>
              <input matInput formControlName="countryOfResidence" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_currency') }}</mat-label>
              <input matInput formControlName="preferredCurrency" maxlength="3" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_language') }}</mat-label>
              <mat-select formControlName="preferredLanguage">
                <mat-option value="es">{{ t('settings_language_es') }}</mat-option>
                <mat-option value="en">{{ t('settings_language_en') }}</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="mobile-stack-actions flex flex-col gap-3 sm:flex-row sm:items-center">
              <button mat-flat-button color="primary" type="submit" [disabled]="profileForm.invalid || savingProfile()">{{ t('settings_save_profile') }}</button>
              <app-feedback-banner [message]="profileMessage()" tone="success" />
            </div>
          </form>
        } @else {
          <p class="p-3 text-sm text-brand-muted">{{ t('settings_loading_profile') }}</p>
        }
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>

      <mat-card class="page-panel p-2">
        <mat-accordion>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>{{ t('settings_report_delivery') }}</mat-panel-title>
            </mat-expansion-panel-header>
        <p class="mb-4 p-3 pb-0 text-sm text-brand-muted">{{ t('settings_report_delivery_hint') }}</p>

        <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-3 p-3 pt-0">
          @for (frequency of frequencies; track frequency.key) {
            <label class="rounded border border-brand-border bg-brand-surface p-3 shadow-sm">
              <mat-checkbox [formControlName]="frequency.key">{{ t(frequency.labelKey) }}</mat-checkbox>
              <div class="ml-10 text-sm text-brand-muted">{{ t(frequency.descriptionKey) }}</div>
            </label>
          }

          <div class="mobile-stack-actions mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">{{ t('settings_save_preferences') }}</button>
            <app-feedback-banner [message]="message()" tone="success" />
          </div>
        </form>
          </mat-expansion-panel>
        </mat-accordion>
      </mat-card>

      <mat-card class="page-panel p-5 xl:col-span-2">
        <div class="grid gap-6 xl:grid-cols-2">
          <section>
            <div class="mb-3">
              <h2 class="text-lg font-semibold text-brand-ink">{{ t('settings_banks_title') }}</h2>
              <p class="mt-1 text-sm text-brand-muted">{{ t('settings_banks_hint') }}</p>
            </div>
            <form [formGroup]="bankForm" (ngSubmit)="createBankOption()" class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('settings_bank_name') }}</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="bankForm.invalid || savingBank()">
                {{ t('settings_bank_add') }}
              </button>
            </form>
            <app-feedback-banner [message]="bankMessage()" [tone]="bankMessage().includes('No se pudo') || bankMessage().includes('Could not') ? 'error' : 'success'" />
            <div class="mt-4 grid gap-2">
              @for (bank of bankOptions(); track bank.id) {
                <div class="flex items-center justify-between rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm">
                  <span>{{ bank.name }}</span>
                  <span class="rounded-full border border-brand-border px-2 py-0.5 text-xs text-brand-muted">{{ bank.isDefault ? t('settings_default_badge') : t('settings_custom_badge') }}</span>
                </div>
              }
            </div>
          </section>

          <section>
            <div class="mb-3">
              <h2 class="text-lg font-semibold text-brand-ink">{{ t('settings_payment_methods_title') }}</h2>
              <p class="mt-1 text-sm text-brand-muted">{{ t('settings_payment_methods_hint') }}</p>
            </div>
            <form [formGroup]="paymentMethodForm" (ngSubmit)="createPaymentMethodOption()" class="grid gap-3">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('settings_payment_method_name') }}</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <div class="grid gap-3 sm:grid-cols-2">
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('settings_payment_method_kind') }}</mat-label>
                  <mat-select formControlName="kind">
                    <mat-option value="cash">{{ t('expenses_cash') }}</mat-option>
                    <mat-option value="transfer">{{ t('expenses_transfer') }}</mat-option>
                    <mat-option value="card">{{ t('expenses_card') }}</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (paymentMethodForm.controls.kind.value === 'card') {
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('expenses_card_type') }}</mat-label>
                    <mat-select formControlName="cardType">
                      <mat-option value="debit">{{ t('expenses_debit') }}</mat-option>
                      <mat-option value="credit">{{ t('expenses_credit') }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                }
              </div>
              <div class="flex justify-start">
                <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="paymentMethodForm.invalid || savingPaymentMethod()">
                  {{ t('settings_payment_method_add') }}
                </button>
              </div>
            </form>
            <app-feedback-banner [message]="paymentMethodMessage()" [tone]="paymentMethodMessage().includes('No se pudo') || paymentMethodMessage().includes('Could not') ? 'error' : 'success'" />
            <div class="mt-4 grid gap-2">
              @for (option of paymentMethodOptions(); track option.id) {
                <div class="flex items-center justify-between rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm">
                  <span>{{ paymentMethodLabel(option) }}</span>
                  <span class="rounded-full border border-brand-border px-2 py-0.5 text-xs text-brand-muted">{{ option.isDefault ? t('settings_default_badge') : t('settings_custom_badge') }}</span>
                </div>
              }
            </div>
          </section>
        </div>
      </mat-card>

      <mat-card class="page-panel p-5 xl:col-span-2">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-brand-ink">{{ t('settings_telegram_title') }}</h2>
            <p class="mt-1 text-sm text-brand-muted">
              {{ user()?.telegramChatId ? t('settings_telegram_connected') : t('settings_telegram_not_connected') }}
            </p>
            @if (user()?.telegramUsername) {
              <p class="mt-1 text-sm text-brand-muted">{{ user()?.telegramUsername }}</p>
            }
          </div>
          @if (!user()?.telegramChatId) {
            <a
              mat-flat-button
              color="primary"
              class="!h-11"
              [href]="telegramBotUrl()"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t('settings_telegram_cta') }}
            </a>
          }
        </div>
        @if (!user()?.telegramChatId) {
          <ol class="mt-4 grid gap-2 text-sm leading-6 text-brand-muted">
            <li>1. {{ t('settings_telegram_step_1') }}</li>
            <li>2. {{ t('settings_telegram_step_2') }}</li>
            <li>3. {{ t('settings_telegram_step_3') }}</li>
          </ol>
        }
      </mat-card>

      <mat-card class="page-panel p-5 xl:col-span-2">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-brand-ink">{{ t('settings_session') }}</h2>
            <p class="mt-1 text-sm text-brand-muted">{{ t('settings_session_hint') }}</p>
          </div>
          <button mat-stroked-button type="button" class="!h-11 !border-brand-border !text-brand-ink" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span class="ml-2">{{ t('settings_logout') }}</span>
          </button>
        </div>
      </mat-card>
    </section>
  `
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly frequencies = frequencies;
  readonly user = signal<CurrentUser | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly savingProfile = signal(false);
  readonly message = signal('');
  readonly profileMessage = signal('');
  readonly bankOptions = signal<BankOption[]>([]);
  readonly paymentMethodOptions = signal<PaymentMethodOption[]>([]);
  readonly savingBank = signal(false);
  readonly savingPaymentMethod = signal(false);
  readonly bankMessage = signal('');
  readonly paymentMethodMessage = signal('');
  readonly telegramBotUrl = signal('https://t.me/');
  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    preferredName: ['', Validators.required],
    email: [''],
    countryOfResidence: ['', Validators.required],
    preferredCurrency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    preferredLanguage: ['es' as 'es' | 'en', Validators.required]
  });
  readonly form = this.fb.nonNullable.group({
    daily: [false],
    weekly: [false],
    monthly: [true],
    yearly: [false]
  });
  readonly bankForm = this.fb.nonNullable.group({
    name: ['', Validators.required]
  });
  readonly paymentMethodForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    kind: ['cash' as 'cash' | 'card' | 'transfer', Validators.required],
    cardType: ['debit' as 'credit' | 'debit']
  });

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly i18n: I18nService
  ) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    this.api.me().subscribe({
      next: (user) => {
        this.user.set(user);
        this.i18n.applyUserPreference(user.preferredLanguage ?? 'es');
        this.profileForm.setValue({
          firstName: user.firstName,
          lastName: user.lastName,
          preferredName: user.preferredName,
          email: user.email ?? '',
          countryOfResidence: user.countryOfResidence,
          preferredCurrency: user.preferredCurrency,
          preferredLanguage: user.preferredLanguage ?? 'es'
        });
        this.form.setValue({
          daily: user.reportPreferences.includes('daily'),
          weekly: user.reportPreferences.includes('weekly'),
          monthly: user.reportPreferences.includes('monthly'),
          yearly: user.reportPreferences.includes('yearly')
        });
        if (!user.telegramChatId) {
          this.api.createTelegramRegistrationLink(user.phoneNumber).subscribe({
            next: (response) => this.telegramBotUrl.set(response.botUrl),
            error: () => this.telegramBotUrl.set('https://t.me/')
          });
        }
        this.api.bankOptions().subscribe({
          next: (banks) => this.bankOptions.set(banks),
          error: () => this.bankOptions.set([])
        });
        this.api.paymentMethodOptions().subscribe({
          next: (options) => this.paymentMethodOptions.set(options),
          error: () => this.paymentMethodOptions.set([])
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(this.t('settings_load_error'));
      }
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    const value = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.profileMessage.set('');
    this.api.updateMe({
      ...value,
      preferredCurrency: value.preferredCurrency.toUpperCase(),
      preferredLanguage: value.preferredLanguage
    }).subscribe({
      next: (user) => {
        this.savingProfile.set(false);
        this.user.set(user);
        this.i18n.applyUserPreference(user.preferredLanguage ?? 'es');
        this.profileMessage.set(this.t('settings_profile_saved'));
      },
      error: () => {
        this.savingProfile.set(false);
        this.profileMessage.set(this.t('settings_profile_save_error'));
      }
    });
  }

  save() {
    const value = this.form.getRawValue();
    const preferences = frequencies
      .filter((frequency) => value[frequency.key])
      .map((frequency) => frequency.key);
    this.saving.set(true);
    this.message.set('');
    this.api.updateReportPreferences(preferences).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(this.t('settings_preferences_saved'));
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.message.set(this.t('settings_preferences_error'));
      }
    });
  }

  createBankOption() {
    if (this.bankForm.invalid) return;
    this.savingBank.set(true);
    this.bankMessage.set('');
    this.api.createBankOption({ name: this.bankForm.getRawValue().name }).subscribe({
      next: (bank) => {
        this.bankOptions.set([...this.bankOptions(), bank].sort(sortByNameThenDefault));
        this.bankForm.reset({ name: '' });
        this.savingBank.set(false);
        this.bankMessage.set(this.t('settings_bank_saved'));
      },
      error: () => {
        this.savingBank.set(false);
        this.bankMessage.set(this.t('settings_bank_save_error'));
      }
    });
  }

  createPaymentMethodOption() {
    if (this.paymentMethodForm.invalid) return;
    this.savingPaymentMethod.set(true);
    this.paymentMethodMessage.set('');
    const value = this.paymentMethodForm.getRawValue();
    this.api.createPaymentMethodOption({
      name: value.name,
      kind: value.kind,
      cardType: value.kind === 'card' ? value.cardType : undefined
    }).subscribe({
      next: (option) => {
        this.paymentMethodOptions.set([...this.paymentMethodOptions(), option].sort(sortPaymentOptions));
        this.paymentMethodForm.reset({ name: '', kind: 'cash', cardType: 'debit' });
        this.savingPaymentMethod.set(false);
        this.paymentMethodMessage.set(this.t('settings_payment_method_saved'));
      },
      error: () => {
        this.savingPaymentMethod.set(false);
        this.paymentMethodMessage.set(this.t('settings_payment_method_save_error'));
      }
    });
  }

  paymentMethodLabel(option: PaymentMethodOption) {
    if (!option.isDefault) return option.name;
    if (option.code === 'cash') return this.t('expenses_cash');
    if (option.code === 'transfer') return this.t('expenses_transfer');
    if (option.code === 'debit_card') return `${this.t('expenses_debit')} ${this.t('expenses_card')}`;
    if (option.code === 'credit_card') return `${this.t('expenses_credit')} ${this.t('expenses_card')}`;
    return option.name;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  t(key: string) {
    return this.i18n.t(key);
  }
}

function sortByNameThenDefault(left: BankOption, right: BankOption) {
  if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
  return left.name.localeCompare(right.name);
}

function sortPaymentOptions(left: PaymentMethodOption, right: PaymentMethodOption) {
  if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
  return left.name.localeCompare(right.name);
}
