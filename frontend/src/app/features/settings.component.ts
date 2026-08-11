import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountContextService } from '../core/account-context.service';
import { ApiService, type BankOption, type CurrentUser, type PaymentMethodOption, type ReportFrequency } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
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
    MatSnackBarModule,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header [title]="t('settings_title')" [eyebrow]="t('settings_subtitle')"></app-page-header>
    <app-feedback-banner [message]="loadError()" tone="error" />
    <app-feedback-banner [message]="loading() ? t('settings_loading') : ''" tone="info" />

    <section class="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <mat-card id="settings-profile-panel" class="page-panel p-2">
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

      <mat-card id="settings-catalogs-panel" class="page-panel p-5 xl:col-span-2">
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
              <div class="flex gap-2 sm:justify-end">
                <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="bankForm.invalid || savingBank()">
                  {{ editingBankId() ? t('common_update') : t('settings_bank_add') }}
                </button>
                @if (editingBankId()) {
                  <button mat-stroked-button type="button" class="!h-11 !border-brand-border !text-brand-ink" (click)="cancelBankEdit()">
                    {{ t('settings_cancel_edit') }}
                  </button>
                }
              </div>
            </form>
            <app-feedback-banner [message]="bankMessage()" [tone]="feedbackTone(bankMessage())" />
            <div class="mt-4 grid gap-2">
              @for (bank of bankOptions(); track bank.id) {
                <div class="flex items-center justify-between rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="truncate">{{ bank.name }}</span>
                    <span class="rounded-full border border-brand-border px-2 py-0.5 text-xs text-brand-muted">{{ bank.isDefault ? t('settings_default_badge') : t('settings_custom_badge') }}</span>
                    @if (editingBankId() === bank.id) {
                      <span class="rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs text-brand-accent">{{ t('settings_editing') }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-1">
                    @if (!bank.isDefault) {
                      <button mat-icon-button type="button" class="!text-brand-ink" (click)="startBankEdit(bank)" [attr.aria-label]="t('common_edit')">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button type="button" class="!text-rose-300" (click)="deleteBankOption(bank)" [attr.aria-label]="t('common_close')">
                        <mat-icon>delete</mat-icon>
                      </button>
                    }
                  </div>
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
              <div class="flex flex-wrap gap-2">
                <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="paymentMethodForm.invalid || savingPaymentMethod()">
                  {{ editingPaymentMethodId() ? t('common_update') : t('settings_payment_method_add') }}
                </button>
                @if (editingPaymentMethodId()) {
                  <button mat-stroked-button type="button" class="!h-11 !border-brand-border !text-brand-ink" (click)="cancelPaymentMethodEdit()">
                    {{ t('settings_cancel_edit') }}
                  </button>
                }
              </div>
            </form>
            <app-feedback-banner [message]="paymentMethodMessage()" [tone]="feedbackTone(paymentMethodMessage())" />
            <div class="mt-4 grid gap-2">
              @for (option of paymentMethodOptions(); track option.id) {
                <div class="flex items-center justify-between rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="truncate">{{ paymentMethodLabel(option) }}</span>
                    <span class="rounded-full border border-brand-border px-2 py-0.5 text-xs text-brand-muted">{{ option.isDefault ? t('settings_default_badge') : t('settings_custom_badge') }}</span>
                    @if (editingPaymentMethodId() === option.id) {
                      <span class="rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs text-brand-accent">{{ t('settings_editing') }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-1">
                    @if (!option.isDefault) {
                      <button mat-icon-button type="button" class="!text-brand-ink" (click)="startPaymentMethodEdit(option)" [attr.aria-label]="t('common_edit')">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button type="button" class="!text-rose-300" (click)="deletePaymentMethodOption(option)" [attr.aria-label]="t('common_close')">
                        <mat-icon>delete</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        </div>
      </mat-card>

      <mat-card id="settings-accounts-panel" class="page-panel p-5 xl:col-span-2">
        <div class="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section class="grid gap-4">
            <div>
              <h2 class="text-lg font-semibold text-brand-ink">{{ t('accounts_title') }}</h2>
              <p class="mt-1 text-sm text-brand-muted">{{ t('accounts_hint') }}</p>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('accounts_current_account') }}</mat-label>
              <mat-select [value]="selectedAccountId()" (selectionChange)="selectAccount($event.value)">
                @for (membership of accountService.accounts(); track membership.account.id) {
                  <mat-option [value]="membership.account.id">
                    {{ membership.account.name }} · {{ t(membership.account.type === 'personal' ? 'accounts_type_personal' : 'accounts_type_shared') }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (selectedMembership()) {
              <div class="rounded border border-brand-border bg-brand-surface p-4 text-sm">
                <div class="font-medium text-brand-ink">{{ selectedMembership()?.account?.name }}</div>
                <div class="mt-1 text-brand-muted">
                  {{ t(selectedMembership()?.account?.type === 'personal' ? 'accounts_type_personal' : 'accounts_type_shared') }}
                  · {{ t(accountRoleKey(selectedMembership()?.role ?? 'member')) }}
                  · {{ selectedMembership()?.account?.currency }}
                </div>
              </div>
            }

            <form [formGroup]="createAccountForm" (ngSubmit)="createAccount()" class="grid gap-3 rounded border border-brand-border bg-brand-surface p-4">
              <div class="text-sm font-medium text-brand-ink">{{ t('accounts_create_title') }}</div>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('accounts_name') }}</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('accounts_currency') }}</mat-label>
                <input matInput formControlName="currency" maxlength="3" />
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="createAccountForm.invalid || savingAccount()">
                {{ t('accounts_create_action') }}
              </button>
            </form>

            @if (canManageSelectedSharedAccount()) {
              <form [formGroup]="renameAccountForm" (ngSubmit)="renameAccount()" class="grid gap-3 rounded border border-brand-border bg-brand-surface p-4">
                <div class="text-sm font-medium text-brand-ink">{{ t('accounts_rename_title') }}</div>
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('accounts_name') }}</mat-label>
                  <input matInput formControlName="name" />
                </mat-form-field>
                <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="renameAccountForm.invalid || savingAccount()">
                  {{ t('accounts_rename_action') }}
                </button>
              </form>
            }

            <app-feedback-banner [message]="accountMessage()" [tone]="feedbackTone(accountMessage())" />
          </section>

          <section class="grid gap-4">
            <form
              [formGroup]="inviteForm"
              (ngSubmit)="inviteMember()"
              class="grid gap-3 rounded border border-brand-border bg-brand-surface p-4"
            >
              <div class="text-sm font-medium text-brand-ink">{{ t('accounts_invite_title') }}</div>
              <div class="grid gap-3 sm:grid-cols-2">
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('login_email') }}</mat-label>
                  <input matInput formControlName="email" type="email" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('login_phone') }}</mat-label>
                  <input matInput formControlName="phoneNumber" />
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('accounts_member_role') }}</mat-label>
                <mat-select formControlName="role">
                  <mat-option value="member">{{ t('accounts_role_member') }}</mat-option>
                  <mat-option value="admin">{{ t('accounts_role_admin') }}</mat-option>
                  <mat-option value="owner">{{ t('accounts_role_owner') }}</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="inviteForm.invalid || !canManageSelectedSharedAccount() || savingInvitation()">
                {{ t('accounts_invite_action') }}
              </button>
            </form>

            <app-feedback-banner [message]="inviteMessage()" [tone]="feedbackTone(inviteMessage())" />

            @if (lastInvitationLink()) {
              <div class="rounded border border-brand-border bg-brand-surface p-4">
                <div class="text-sm font-medium text-brand-ink">{{ t('accounts_invite_link_title') }}</div>
                <p class="mt-1 text-sm text-brand-muted">
                  {{ t('accounts_invite_link_hint') }}
                  @if (lastInvitationEmail()) {
                    <span class="font-medium text-brand-ink">{{ lastInvitationEmail() }}</span>
                  }
                </p>
                <div class="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('accounts_invite_link_label') }}</mat-label>
                    <input matInput [value]="lastInvitationLink()" readonly />
                  </mat-form-field>
                  <button mat-stroked-button type="button" class="!h-11 !border-brand-border !text-brand-ink" (click)="copyInvitationLink()">
                    {{ t('accounts_invite_copy') }}
                  </button>
                  <a
                    mat-flat-button
                    color="primary"
                    class="!h-11"
                    [href]="lastInvitationLink()"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ t('accounts_invite_open') }}
                  </a>
                </div>
              </div>
            }

            <div class="rounded border border-brand-border bg-brand-surface p-4">
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-medium text-brand-ink">{{ t('accounts_members_title') }}</h3>
                  <p class="mt-1 text-sm text-brand-muted">{{ t('accounts_members_hint') }}</p>
                </div>
                @if (accountService.membersLoading()) {
                  <span class="text-sm text-brand-muted">{{ t('common_loading') }}</span>
                }
              </div>
              <div class="grid gap-2">
                @for (member of accountService.members(); track member.memberId) {
                  <div class="flex flex-col gap-3 rounded border border-brand-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <div class="truncate font-medium text-brand-ink">{{ member.preferredName }}</div>
                      <div class="mt-1 text-sm text-brand-muted">
                        {{ member.email || member.phoneNumber }} · {{ t(accountRoleKey(member.role)) }}
                      </div>
                    </div>
                    @if (canRemoveMember(member.userId, member.role)) {
                      <button mat-stroked-button type="button" class="!h-10 !border-brand-border !text-brand-ink" (click)="removeMember(member.userId)">
                        {{ t('accounts_remove_member') }}
                      </button>
                    }
                  </div>
                } @empty {
                  <div class="text-sm text-brand-muted">{{ t('common_no_data') }}</div>
                }
              </div>
            </div>
          </section>
        </div>
      </mat-card>

      <mat-card id="settings-telegram-panel" class="page-panel p-5 xl:col-span-2">
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
  private readonly snackBar = inject(MatSnackBar);
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
  readonly editingBankId = signal<string | null>(null);
  readonly editingPaymentMethodId = signal<string | null>(null);
  readonly telegramBotUrl = signal('https://t.me/');
  readonly accountMessage = signal('');
  readonly inviteMessage = signal('');
  readonly lastInvitationLink = signal('');
  readonly lastInvitationEmail = signal('');
  readonly savingAccount = signal(false);
  readonly savingInvitation = signal(false);
  readonly selectedAccountId = signal<string | null>(null);
  private invitationTokenProcessed = false;
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
  readonly createAccountForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
  });
  readonly renameAccountForm = this.fb.nonNullable.group({
    name: ['', Validators.required]
  });
  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    role: ['member' as 'owner' | 'admin' | 'member', Validators.required]
  });

  constructor(
    private readonly api: ApiService,
    readonly accountService: AccountContextService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly i18n: I18nService,
    private readonly onboarding: OnboardingService
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
        if (!this.accountService.context()) {
          this.accountService.load().subscribe({
            next: (context) => {
              this.selectedAccountId.set(context.current.account.id);
              this.renameAccountForm.reset({ name: context.current.account.name });
              this.loadMembers();
              this.maybeAcceptInvitationFromRoute();
            },
            error: () => {}
          });
        } else {
          const currentAccount = this.accountService.currentAccount();
          this.selectedAccountId.set(currentAccount?.id ?? null);
          this.renameAccountForm.reset({ name: currentAccount?.name ?? '' });
          this.loadMembers();
          this.maybeAcceptInvitationFromRoute();
        }
        this.loading.set(false);
        setTimeout(() => this.startOnboarding(), 50);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(this.t('settings_load_error'));
      }
    });
  }

  selectedMembership() {
    const selectedId = this.selectedAccountId();
    return this.accountService.accounts().find((membership) => membership.account.id === selectedId) ?? this.accountService.currentMembership();
  }

  canManageSelectedSharedAccount() {
    const membership = this.selectedMembership();
    return Boolean(membership && membership.account.type === 'shared' && ['owner', 'admin'].includes(membership.role));
  }

  accountRoleKey(role: 'owner' | 'admin' | 'member') {
    return `accounts_role_${role}`;
  }

  selectAccount(accountId: string) {
    this.selectedAccountId.set(accountId);
    const selected = this.selectedMembership();
    this.renameAccountForm.reset({ name: selected?.account.name ?? '' });
    this.loadMembers();
  }

  createAccount() {
    if (this.createAccountForm.invalid) return;
    const value = this.createAccountForm.getRawValue();
    this.savingAccount.set(true);
    this.accountMessage.set('');
    this.api.createAccount({
      name: value.name,
      currency: value.currency.toUpperCase()
    }).subscribe({
      next: (membership) => {
        this.accountService.insertAccount(membership);
        this.createAccountForm.reset({ name: '', currency: value.currency.toUpperCase() });
        this.savingAccount.set(false);
        this.accountMessage.set(this.t('accounts_create_success'));
      },
      error: () => {
        this.savingAccount.set(false);
        this.accountMessage.set(this.t('accounts_create_error'));
      }
    });
  }

  renameAccount() {
    const membership = this.selectedMembership();
    if (!membership || this.renameAccountForm.invalid || membership.account.type !== 'shared') return;
    this.savingAccount.set(true);
    this.accountMessage.set('');
    this.api.updateAccount(membership.account.id, {
      name: this.renameAccountForm.getRawValue().name
    }).subscribe({
      next: (account) => {
        this.accountService.updateLocalAccount(account);
        this.savingAccount.set(false);
        this.accountMessage.set(this.t('accounts_rename_success'));
      },
      error: () => {
        this.savingAccount.set(false);
        this.accountMessage.set(this.t('accounts_rename_error'));
      }
    });
  }

  inviteMember() {
    const membership = this.selectedMembership();
    if (!membership || membership.account.type !== 'shared' || this.inviteForm.invalid) return;
    const value = this.inviteForm.getRawValue();
    this.savingInvitation.set(true);
    this.inviteMessage.set('');
    this.api.createAccountInvitation(membership.account.id, {
      email: value.email,
      phoneNumber: value.phoneNumber || undefined,
      role: value.role
    }).subscribe({
      next: (invitation) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        this.lastInvitationLink.set(`${origin}/settings?accountInvitationToken=${encodeURIComponent(invitation.token)}`);
        this.lastInvitationEmail.set(invitation.email);
        this.inviteForm.reset({ email: '', phoneNumber: '', role: 'member' });
        this.savingInvitation.set(false);
        this.inviteMessage.set(this.t('accounts_invite_success'));
      },
      error: () => {
        this.savingInvitation.set(false);
        this.inviteMessage.set(this.t('accounts_invite_error'));
      }
    });
  }

  copyInvitationLink() {
    const link = this.lastInvitationLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(
      () => this.snackBar.open(this.t('accounts_invite_copy_success'), undefined, { duration: 2200 }),
      () => this.snackBar.open(this.t('accounts_invite_copy_error'), undefined, { duration: 2600 })
    );
  }

  canRemoveMember(memberUserId: string, memberRole: 'owner' | 'admin' | 'member') {
    const membership = this.selectedMembership();
    const user = this.user();
    if (!membership || !user) return false;
    if (!['owner', 'admin'].includes(membership.role)) return false;
    if (memberUserId === user.id) return false;
    if (memberRole === 'owner' && membership.role !== 'owner') return false;
    return true;
  }

  removeMember(memberUserId: string) {
    const membership = this.selectedMembership();
    if (!membership) return;
    if (!confirm(this.t('accounts_remove_confirm'))) return;
    this.api.removeAccountMember(membership.account.id, memberUserId).subscribe({
      next: () => {
        this.loadMembers();
        this.snackBar.open(this.t('accounts_remove_success'), undefined, { duration: 2400 });
      },
      error: () => {
        this.snackBar.open(this.t('accounts_remove_error'), undefined, { duration: 2800 });
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
    const editingId = this.editingBankId();
    const request = editingId
      ? this.api.updateBankOption(editingId, { name: this.bankForm.getRawValue().name })
      : this.api.createBankOption({ name: this.bankForm.getRawValue().name });
    request.subscribe({
      next: (bank) => {
        this.bankOptions.set(upsertSortedBank(this.bankOptions(), bank));
        this.cancelBankEdit();
        this.savingBank.set(false);
        this.bankMessage.set(this.t(editingId ? 'settings_bank_updated' : 'settings_bank_saved'));
      },
      error: () => {
        this.savingBank.set(false);
        this.bankMessage.set(this.t(editingId ? 'settings_bank_update_error' : 'settings_bank_save_error'));
      }
    });
  }

  createPaymentMethodOption() {
    if (this.paymentMethodForm.invalid) return;
    this.savingPaymentMethod.set(true);
    this.paymentMethodMessage.set('');
    const value = this.paymentMethodForm.getRawValue();
    const editingId = this.editingPaymentMethodId();
    const payload = {
      name: value.name,
      kind: value.kind,
      cardType: value.kind === 'card' ? value.cardType : undefined
    } as const;
    const request = editingId
      ? this.api.updatePaymentMethodOption(editingId, payload)
      : this.api.createPaymentMethodOption(payload);
    request.subscribe({
      next: (option) => {
        this.paymentMethodOptions.set(upsertSortedPaymentMethod(this.paymentMethodOptions(), option));
        this.cancelPaymentMethodEdit();
        this.savingPaymentMethod.set(false);
        this.paymentMethodMessage.set(this.t(editingId ? 'settings_payment_method_updated' : 'settings_payment_method_saved'));
      },
      error: () => {
        this.savingPaymentMethod.set(false);
        this.paymentMethodMessage.set(this.t(editingId ? 'settings_payment_method_update_error' : 'settings_payment_method_save_error'));
      }
    });
  }

  startBankEdit(bank: BankOption) {
    this.editingBankId.set(bank.id);
    this.bankForm.reset({ name: bank.name });
    this.bankMessage.set('');
  }

  cancelBankEdit() {
    this.editingBankId.set(null);
    this.bankForm.reset({ name: '' });
  }

  deleteBankOption(bank: BankOption) {
    if (!confirm(this.t('settings_delete_confirm'))) return;
    this.savingBank.set(true);
    this.bankMessage.set('');
    this.api.deleteBankOption(bank.id).subscribe({
      next: () => {
        this.bankOptions.set(this.bankOptions().filter((item) => item.id !== bank.id));
        if (this.editingBankId() === bank.id) this.cancelBankEdit();
        this.savingBank.set(false);
        this.bankMessage.set(this.t('settings_bank_deleted'));
      },
      error: () => {
        this.savingBank.set(false);
        this.bankMessage.set(this.t('settings_bank_delete_error'));
      }
    });
  }

  startPaymentMethodEdit(option: PaymentMethodOption) {
    this.editingPaymentMethodId.set(option.id);
    this.paymentMethodForm.reset({
      name: option.name,
      kind: option.kind,
      cardType: option.cardType ?? 'debit'
    });
    this.paymentMethodMessage.set('');
  }

  cancelPaymentMethodEdit() {
    this.editingPaymentMethodId.set(null);
    this.paymentMethodForm.reset({ name: '', kind: 'cash', cardType: 'debit' });
  }

  deletePaymentMethodOption(option: PaymentMethodOption) {
    if (!confirm(this.t('settings_delete_confirm'))) return;
    this.savingPaymentMethod.set(true);
    this.paymentMethodMessage.set('');
    this.api.deletePaymentMethodOption(option.id).subscribe({
      next: () => {
        this.paymentMethodOptions.set(this.paymentMethodOptions().filter((item) => item.id !== option.id));
        if (this.editingPaymentMethodId() === option.id) this.cancelPaymentMethodEdit();
        this.savingPaymentMethod.set(false);
        this.paymentMethodMessage.set(this.t('settings_payment_method_deleted'));
      },
      error: () => {
        this.savingPaymentMethod.set(false);
        this.paymentMethodMessage.set(this.t('settings_payment_method_delete_error'));
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

  feedbackTone(message: string) {
    return message.includes('No se pudo') || message.includes('Could not') ? 'error' : 'success';
  }

  private loadMembers() {
    const accountId = this.selectedAccountId();
    if (!accountId) return;
    this.accountService.refreshMembers(accountId).subscribe({ error: () => {} });
  }

  private maybeAcceptInvitationFromRoute() {
    if (this.invitationTokenProcessed) return;
    const token = this.route.snapshot.queryParamMap.get('accountInvitationToken');
    if (!token) return;
    this.invitationTokenProcessed = true;
    this.accountMessage.set('');
    this.api.acceptAccountInvitation(token).subscribe({
      next: ({ membership }) => {
        this.accountService.switchAccount(membership.account.id).subscribe({
          next: () => {
            this.selectedAccountId.set(membership.account.id);
            this.renameAccountForm.reset({ name: membership.account.name });
            this.loadMembers();
            this.accountMessage.set(this.t('accounts_invite_accept_success'));
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { accountInvitationToken: null },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });
          },
          error: () => {
            this.selectedAccountId.set(membership.account.id);
            this.accountMessage.set(this.t('accounts_invite_accept_success'));
          }
        });
      },
      error: () => {
        this.accountMessage.set(this.t('accounts_invite_accept_error'));
      }
    });
  }

  private startOnboarding() {
    void this.onboarding.startOnce('settings', [
      {
        element: '#settings-profile-panel',
        title: this.t('onboarding_settings_title'),
        description: this.t('onboarding_settings_desc')
      },
      {
        element: '#settings-profile-panel',
        title: this.t('onboarding_settings_profile_title'),
        description: this.t('onboarding_settings_profile_desc')
      },
      {
        element: '#settings-catalogs-panel',
        title: this.t('onboarding_settings_catalogs_title'),
        description: this.t('onboarding_settings_catalogs_desc')
      },
      {
        element: '#settings-accounts-panel',
        title: this.t('onboarding_settings_accounts_title'),
        description: this.t('onboarding_settings_accounts_desc')
      },
      {
        element: '#settings-telegram-panel',
        title: this.t('onboarding_settings_telegram_title'),
        description: this.t('onboarding_settings_telegram_desc')
      }
    ]);
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

function upsertSortedBank(banks: BankOption[], updated: BankOption) {
  const next = banks.filter((bank) => bank.id !== updated.id);
  next.push(updated);
  return next.sort(sortByNameThenDefault);
}

function upsertSortedPaymentMethod(options: PaymentMethodOption[], updated: PaymentMethodOption) {
  const next = options.filter((option) => option.id !== updated.id);
  next.push(updated);
  return next.sort(sortPaymentOptions);
}
