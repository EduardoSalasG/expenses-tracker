import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountContextService } from '../core/account-context.service';
import { formatFinancialAccountLabel } from '../core/account-label';
import {
  ApiService,
  type BankOption,
  type CurrentUser,
  type FinancialAccountMemberBalance,
  type FinancialAccountSettlementSuggestion,
  type FinancialAccountSettlement,
  type PaymentMethodOption,
  type ReportFrequency
} from '../core/api.service';
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

type SettingsSectionId = 'profile' | 'reports' | 'catalogs' | 'accounts' | 'telegram' | 'session';

const settingsSections: Array<{ id: SettingsSectionId; icon: string; titleKey: string; descriptionKey: string }> = [
  { id: 'profile', icon: 'person', titleKey: 'settings_section_profile_title', descriptionKey: 'settings_section_profile_description' },
  { id: 'reports', icon: 'summarize', titleKey: 'settings_section_reports_title', descriptionKey: 'settings_section_reports_description' },
  { id: 'catalogs', icon: 'account_balance', titleKey: 'settings_section_catalogs_title', descriptionKey: 'settings_section_catalogs_description' },
  { id: 'accounts', icon: 'group', titleKey: 'settings_section_accounts_title', descriptionKey: 'settings_section_accounts_description' },
  { id: 'telegram', icon: 'send', titleKey: 'settings_section_telegram_title', descriptionKey: 'settings_section_telegram_description' },
  { id: 'session', icon: 'logout', titleKey: 'settings_section_session_title', descriptionKey: 'settings_section_session_description' }
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
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

    @if (!activeSettingsSection()) {
      <section class="settings-overview-grid" [attr.aria-label]="t('settings_sections_label')">
        @for (section of settingsSections; track section.id) {
          <button type="button" class="settings-overview-card" (click)="openSettingsSection(section.id)">
            <mat-icon aria-hidden="true">{{ section.icon }}</mat-icon>
            <span class="settings-overview-card__copy">
              <span class="settings-overview-card__title">{{ t(section.titleKey) }}</span>
              <span class="settings-overview-card__description">{{ t(section.descriptionKey) }}</span>
            </span>
            <mat-icon class="settings-overview-card__arrow" aria-hidden="true">chevron_right</mat-icon>
          </button>
        }
      </section>
    } @else {
      <section class="settings-workspace">
        <aside class="settings-section-nav" [attr.aria-label]="t('settings_sections_label')">
          @for (section of settingsSections; track section.id) {
            <button
              type="button"
              class="settings-section-nav__item"
              [class.settings-section-nav__item--active]="activeSettingsSection() === section.id"
              (click)="openSettingsSection(section.id)">
              <mat-icon aria-hidden="true">{{ section.icon }}</mat-icon>
              <span>{{ t(section.titleKey) }}</span>
            </button>
          }
        </aside>

        <div class="min-w-0">
          <header class="settings-detail-header">
            <button mat-stroked-button type="button" class="settings-back-button" (click)="closeSettingsSection()">
              <mat-icon>arrow_back</mat-icon>
              {{ t('settings_back') }}
            </button>
            @if (activeSettingsMetadata(); as section) {
              <div>
                <h2 class="text-xl font-semibold text-brand-ink">{{ t(section.titleKey) }}</h2>
                <p class="mt-1 text-sm text-brand-muted">{{ t(section.descriptionKey) }}</p>
              </div>
            }
          </header>

          <section class="grid gap-4">
      <mat-card id="settings-profile-panel" class="page-panel p-2" [style.display]="activeSettingsSection() === 'profile' ? '' : 'none'">
        <mat-accordion>
          <mat-expansion-panel [expanded]="activeSettingsSection() === 'profile'">
            <mat-expansion-panel-header>
              <mat-panel-title>{{ t('settings_profile_panel') }}</mat-panel-title>
            </mat-expansion-panel-header>
        @if (user()) {
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="grid gap-3 p-3">
            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_first_name') }}</mat-label>
              <input matInput id="settings-first-name" name="settingsFirstName" formControlName="firstName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_last_name') }}</mat-label>
              <input matInput id="settings-last-name" name="settingsLastName" formControlName="lastName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_preferred_name') }}</mat-label>
              <input matInput id="settings-preferred-name" name="settingsPreferredName" formControlName="preferredName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_phone') }}</mat-label>
              <input matInput id="settings-phone" name="settingsPhoneNumber" [value]="user()?.phoneNumber" disabled />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_email') }}</mat-label>
              <input matInput id="settings-email" name="settingsEmail" formControlName="email" type="email" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_country') }}</mat-label>
              <input matInput id="settings-country" name="settingsCountryOfResidence" formControlName="countryOfResidence" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_currency') }}</mat-label>
              <input matInput id="settings-currency" name="settingsPreferredCurrency" formControlName="preferredCurrency" maxlength="3" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_language') }}</mat-label>
              <mat-select id="settings-language" name="settingsPreferredLanguage" formControlName="preferredLanguage">
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

      <mat-card class="page-panel p-2" [style.display]="activeSettingsSection() === 'reports' ? '' : 'none'">
        <mat-accordion>
          <mat-expansion-panel [expanded]="activeSettingsSection() === 'reports'">
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

      <mat-card id="settings-catalogs-panel" class="page-panel p-5" [style.display]="activeSettingsSection() === 'catalogs' ? '' : 'none'">
        <div class="grid gap-6 xl:grid-cols-2">
          <section>
            <div class="mb-3">
              <h2 class="text-lg font-semibold text-brand-ink">{{ t('settings_banks_title') }}</h2>
              <p class="mt-1 text-sm text-brand-muted">{{ t('settings_banks_hint') }}</p>
            </div>
            <form [formGroup]="bankForm" (ngSubmit)="createBankOption()" class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('settings_bank_name') }}</mat-label>
                <input matInput id="settings-bank-name" name="settingsBankName" formControlName="name" />
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
                <input matInput id="settings-payment-method-name" name="settingsPaymentMethodName" formControlName="name" />
              </mat-form-field>
              <div class="grid gap-3 sm:grid-cols-2">
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('settings_payment_method_kind') }}</mat-label>
                  <mat-select id="settings-payment-method-kind" name="settingsPaymentMethodKind" formControlName="kind">
                    <mat-option value="cash">{{ t('expenses_cash') }}</mat-option>
                    <mat-option value="transfer">{{ t('expenses_transfer') }}</mat-option>
                    <mat-option value="card">{{ t('expenses_card') }}</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (paymentMethodForm.controls.kind.value === 'card') {
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('expenses_card_type') }}</mat-label>
                    <mat-select id="settings-payment-method-card-type" name="settingsPaymentMethodCardType" formControlName="cardType">
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

      <mat-card id="settings-accounts-panel" class="page-panel p-5" [style.display]="activeSettingsSection() === 'accounts' ? '' : 'none'">
        <div class="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section class="grid gap-4">
            <div>
              <h2 class="text-lg font-semibold text-brand-ink">{{ t('accounts_title') }}</h2>
              <p class="mt-1 text-sm text-brand-muted">{{ t('accounts_hint') }}</p>
            </div>

            @if (selectedMembership()) {
              <div class="shared-account-summary text-sm">
                <div class="font-medium text-brand-ink">{{ formatAccountLabel(selectedMembership()?.account?.name ?? '', selectedMembership()?.account?.type ?? 'personal') }}</div>
                <div class="mt-1 text-brand-muted">
                  {{ t(accountRoleKey(selectedMembership()?.role ?? 'member')) }}
                  · {{ selectedMembership()?.account?.currency }}
                </div>
              </div>
            }

            @if (canManageSelectedSharedAccount()) {
              <form [formGroup]="renameAccountForm" (ngSubmit)="renameAccount()" class="grid gap-3 rounded border border-brand-border bg-brand-surface p-4">
                <div class="text-sm font-medium text-brand-ink">{{ t('accounts_rename_title') }}</div>
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('accounts_name') }}</mat-label>
                  <input matInput id="settings-rename-account-name" name="settingsRenameAccountName" formControlName="name" />
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
              class="shared-account-section shared-account-section--invite grid gap-3"
            >
              <div class="text-sm font-medium text-brand-ink">{{ t('accounts_invite_title') }}</div>
              <p class="text-sm text-brand-muted">{{ t('accounts_create_invite_hint') }}</p>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('login_email') }}</mat-label>
                <input matInput id="settings-invite-email" name="settingsInviteEmail" formControlName="email" type="email" />
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="inviteForm.invalid || !canManageSelectedSharedAccount() || savingInvitation()">
                {{ t('accounts_invite_action') }}
              </button>
            </form>

            <app-feedback-banner [message]="inviteMessage()" [tone]="feedbackTone(inviteMessage())" />

            @if (lastInvitationLink()) {
              <div class="shared-account-section">
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
                      <input matInput id="settings-invitation-link" name="settingsInvitationLink" [value]="lastInvitationLink()" readonly />
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

            <div class="shared-account-section">
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

            @if (selectedMembership()?.account?.type === 'shared') {
              <div class="shared-account-section">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="font-medium text-brand-ink">{{ t('accounts_balances_title') }}</h3>
                    <p class="mt-1 text-sm text-brand-muted">{{ t('accounts_balances_hint') }}</p>
                  </div>
                  @if (balancesLoading()) {
                    <span class="text-sm text-brand-muted">{{ t('common_loading') }}</span>
                  }
                </div>
                <div class="grid gap-2">
                  @for (balance of accountBalances(); track balance.userId + balance.currency) {
                    <div class="flex items-center justify-between gap-3 rounded border border-brand-border/70 px-3 py-3">
                      <div class="min-w-0">
                        <div class="truncate font-medium text-brand-ink">{{ memberDisplayName(balance.userId, balance.preferredName) }}</div>
                        <div class="mt-1 text-sm text-brand-muted">{{ balance.currency }}</div>
                      </div>
                      <div
                        class="text-right text-sm font-semibold"
                        [class.text-emerald-300]="balance.netAmount > 0"
                        [class.text-rose-300]="balance.netAmount < 0"
                        [class.text-brand-muted]="balance.netAmount === 0">
                        {{ formatMoney(balance.currency, balance.netAmount) }}
                      </div>
                    </div>
                  } @empty {
                    <div class="text-sm text-brand-muted">{{ t('accounts_balances_empty') }}</div>
                  }
                </div>
              </div>

              <div class="shared-account-section">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="font-medium text-brand-ink">{{ t('accounts_suggestions_title') }}</h3>
                    <p class="mt-1 text-sm text-brand-muted">{{ t('accounts_suggestions_hint') }}</p>
                  </div>
                  @if (suggestionsLoading()) {
                    <span class="text-sm text-brand-muted">{{ t('common_loading') }}</span>
                  }
                </div>
                <div class="grid gap-2">
                  @for (suggestion of settlementSuggestions(); track suggestion.fromUserId + suggestion.toUserId + suggestion.currency) {
                    <div class="flex items-center justify-between gap-3 rounded border border-brand-border/70 px-3 py-3">
                      <div class="min-w-0">
                        <div class="truncate font-medium text-brand-ink">
                          {{ t('accounts_suggestions_direction').replace('{from}', suggestion.fromPreferredName).replace('{to}', suggestion.toPreferredName) }}
                        </div>
                        <div class="mt-1 text-sm text-brand-muted">{{ suggestion.currency }}</div>
                      </div>
                      <div class="text-right text-sm font-semibold text-brand-ink">
                        {{ formatMoney(suggestion.currency, suggestion.amount) }}
                      </div>
                    </div>
                  } @empty {
                    <div class="text-sm text-brand-muted">{{ t('accounts_suggestions_empty') }}</div>
                  }
                </div>
              </div>

              <form
                [formGroup]="settlementForm"
                (ngSubmit)="createSettlement()"
                class="shared-account-section grid gap-3"
              >
                <div>
                  <div class="text-sm font-medium text-brand-ink">{{ t('accounts_settlement_title') }}</div>
                  <p class="mt-1 text-sm text-brand-muted">{{ t('accounts_settlement_hint') }}</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('accounts_settlement_paid_by') }}</mat-label>
                      <mat-select id="settings-settlement-paid-by" name="settingsSettlementPaidByUserId" formControlName="paidByUserId">
                        @for (member of activeSharedMembers(); track member.userId) {
                          <mat-option [value]="member.userId">{{ member.preferredName }}</mat-option>
                        }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('accounts_settlement_received_by') }}</mat-label>
                      <mat-select id="settings-settlement-received-by" name="settingsSettlementReceivedByUserId" formControlName="receivedByUserId">
                        @for (member of activeSharedMembers(); track member.userId) {
                          <mat-option [value]="member.userId">{{ member.preferredName }}</mat-option>
                        }
                    </mat-select>
                  </mat-form-field>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('accounts_currency') }}</mat-label>
                      <input matInput id="settings-settlement-currency" name="settingsSettlementCurrency" formControlName="currency" maxlength="3" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('expenses_amount') }}</mat-label>
                      <input matInput id="settings-settlement-amount" name="settingsSettlementAmount" type="number" formControlName="amount" />
                  </mat-form-field>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('accounts_settlement_date') }}</mat-label>
                      <input matInput id="settings-settlement-date" name="settingsSettlementDate" type="date" formControlName="settledAt" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('accounts_settlement_note') }}</mat-label>
                      <input matInput id="settings-settlement-note" name="settingsSettlementNote" formControlName="note" />
                  </mat-form-field>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button mat-flat-button color="primary" type="submit" class="!h-11" [disabled]="settlementForm.invalid || savingSettlement()">
                    {{ t('accounts_settlement_action') }}
                  </button>
                </div>
              </form>

              <app-feedback-banner [message]="settlementMessage()" [tone]="feedbackTone(settlementMessage())" />

              <div class="shared-account-section">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="font-medium text-brand-ink">{{ t('accounts_settlement_history_title') }}</h3>
                    <p class="mt-1 text-sm text-brand-muted">{{ t('accounts_settlement_history_hint') }}</p>
                  </div>
                  @if (settlementsLoading()) {
                    <span class="text-sm text-brand-muted">{{ t('common_loading') }}</span>
                  }
                </div>
                <div class="grid gap-2">
                  @for (settlement of accountSettlements(); track settlement.id) {
                    <div class="rounded border border-brand-border/70 px-3 py-3">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div class="font-medium text-brand-ink">
                            {{ settlementDirectionLabel(settlement) }}
                          </div>
                          <div class="mt-1 text-sm text-brand-muted">
                            {{ formatDate(settlement.settledAt) }}
                            @if (settlement.note) {
                              · {{ settlement.note }}
                            }
                          </div>
                        </div>
                        <div class="text-right text-sm font-semibold text-brand-ink">
                          {{ formatMoney(settlement.currency, settlement.amount) }}
                        </div>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-sm text-brand-muted">{{ t('accounts_settlement_history_empty') }}</div>
                  }
                </div>
              </div>
            }
          </section>
        </div>
      </mat-card>

      <mat-card id="settings-telegram-panel" class="page-panel p-5" [style.display]="activeSettingsSection() === 'telegram' ? '' : 'none'">
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

      <mat-card class="page-panel p-5" [style.display]="activeSettingsSection() === 'session' ? '' : 'none'">
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
        </div>
      </section>
    }
  `
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly frequencies = frequencies;
  readonly settingsSections = settingsSections;
  readonly activeSettingsSection = signal<SettingsSectionId | null>(null);
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
  readonly accountBalances = signal<FinancialAccountMemberBalance[]>([]);
  readonly settlementSuggestions = signal<FinancialAccountSettlementSuggestion[]>([]);
  readonly accountSettlements = signal<FinancialAccountSettlement[]>([]);
  readonly balancesLoading = signal(false);
  readonly suggestionsLoading = signal(false);
  readonly settlementsLoading = signal(false);
  readonly savingSettlement = signal(false);
  readonly settlementMessage = signal('');
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
  readonly renameAccountForm = this.fb.nonNullable.group({
    name: ['', Validators.required]
  });
  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });
  readonly settlementForm = this.fb.nonNullable.group({
    paidByUserId: ['', Validators.required],
    receivedByUserId: ['', Validators.required],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    settledAt: [toDateInputValue(new Date()), Validators.required],
    note: ['']
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
    effect(() => {
      const currentAccountId = this.accountService.activeAccountId();
      const accountLoading = this.accountService.loading();
      if (!currentAccountId || accountLoading) return;
      this.handleActiveAccountChanged();
    });
  }

  openSettingsSection(section: SettingsSectionId) {
    this.activeSettingsSection.set(section);
  }

  closeSettingsSection() {
    this.activeSettingsSection.set(null);
  }

  activeSettingsMetadata() {
    const active = this.activeSettingsSection();
    return settingsSections.find((section) => section.id === active) ?? null;
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
              this.renameAccountForm.reset({ name: context.current.account.name });
              this.loadSharedAccountData();
              this.maybeAcceptInvitationFromRoute();
            },
            error: () => {}
          });
        } else {
          const currentAccount = this.accountService.activeAccount();
          this.renameAccountForm.reset({ name: currentAccount?.name ?? '' });
          this.loadSharedAccountData();
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
    return this.accountService.activeMembership();
  }

  canManageSelectedSharedAccount() {
    const membership = this.selectedMembership();
    return Boolean(membership && membership.account.type === 'shared' && ['owner', 'admin'].includes(membership.role));
  }

  accountRoleKey(role: 'owner' | 'admin' | 'member') {
    return `accounts_role_${role}`;
  }

  formatAccountLabel(name: string, type: 'personal' | 'shared') {
    return formatFinancialAccountLabel(name, type, this.t('accounts_type_shared'));
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
      email: value.email
    }).subscribe({
      next: (invitation) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        this.lastInvitationLink.set(`${origin}/settings?accountInvitationToken=${encodeURIComponent(invitation.token)}`);
        this.lastInvitationEmail.set(invitation.email);
        this.inviteForm.reset({ email: '' });
        this.savingInvitation.set(false);
        this.inviteMessage.set(this.t(invitation.emailSentAt ? 'accounts_invite_email_sent' : 'accounts_invite_link_only'));
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
        this.loadSharedAccountData();
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

  activeSharedMembers() {
    return this.accountService.members().filter((member) => member.status === 'active');
  }

  memberDisplayName(userId: string, fallback: string) {
    return this.accountService.members().find((member) => member.userId === userId)?.preferredName ?? fallback;
  }

  settlementDirectionLabel(settlement: FinancialAccountSettlement) {
    const paidBy = settlement.paidByPreferredName ?? this.memberDisplayName(settlement.paidByUserId, '');
    const receivedBy = settlement.receivedByPreferredName ?? this.memberDisplayName(settlement.receivedByUserId, '');
    return this.t('accounts_settlement_direction')
      .replace('{paidBy}', paidBy)
      .replace('{receivedBy}', receivedBy);
  }

  formatMoney(currency: string, amount: number) {
    const locale = this.i18n.language() === 'es' ? 'es-CL' : 'en-US';
    if (currency.toUpperCase() === 'CLP') {
      return `${amount < 0 ? '-' : ''}$${Math.abs(Number(amount)).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount));
  }

  formatDate(value: string) {
    const locale = this.i18n.language() === 'es' ? 'es-CL' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  }

  createSettlement() {
    const membership = this.selectedMembership();
    if (!membership || membership.account.type !== 'shared' || this.settlementForm.invalid) return;
    const value = this.settlementForm.getRawValue();
    this.savingSettlement.set(true);
    this.settlementMessage.set('');
    this.api.createAccountSettlement(membership.account.id, {
      paidByUserId: value.paidByUserId,
      receivedByUserId: value.receivedByUserId,
      currency: value.currency.toUpperCase(),
      amount: Number(value.amount),
      settledAt: startOfDay(value.settledAt),
      note: value.note || undefined
    }).subscribe({
      next: (settlement) => {
        this.accountSettlements.update((items) => [settlement, ...items]);
        this.settlementForm.reset({
          paidByUserId: '',
          receivedByUserId: '',
          currency: membership.account.currency,
          amount: 0,
          settledAt: toDateInputValue(new Date()),
          note: ''
        });
        this.savingSettlement.set(false);
        this.settlementMessage.set(this.t('accounts_settlement_success'));
        this.loadBalances(membership.account.id);
        this.loadSettlementSuggestions(membership.account.id);
      },
      error: () => {
        this.savingSettlement.set(false);
        this.settlementMessage.set(this.t('accounts_settlement_error'));
      }
    });
  }

  private loadSharedAccountData() {
    const selected = this.selectedMembership();
    const accountId = selected?.account.id;
    if (!accountId) return;
    this.accountService.refreshMembers(accountId).subscribe({
      next: () => this.handleSharedAccountSelection(),
      error: () => this.handleSharedAccountSelection()
    });
  }

  private handleActiveAccountChanged() {
    const currentAccount = this.accountService.activeAccount();
    this.renameAccountForm.reset({ name: currentAccount?.name ?? '' });
    this.lastInvitationLink.set('');
    this.lastInvitationEmail.set('');
    this.inviteMessage.set('');
    this.accountMessage.set('');
    this.loadSharedAccountData();
  }

  private handleSharedAccountSelection() {
    const selected = this.selectedMembership();
    if (!selected) return;
    if (selected.account.type !== 'shared') {
      this.accountBalances.set([]);
      this.settlementSuggestions.set([]);
      this.accountSettlements.set([]);
      this.settlementMessage.set('');
      return;
    }

    const preferredCurrency = selected.account.currency;
    const currentUser = this.user();
    const activeMembers = this.activeSharedMembers();
    this.settlementForm.patchValue({
      paidByUserId: this.settlementForm.controls.paidByUserId.value || currentUser?.id || activeMembers[0]?.userId || '',
      receivedByUserId: this.settlementForm.controls.receivedByUserId.value || activeMembers.find((member) => member.userId !== currentUser?.id)?.userId || '',
      currency: preferredCurrency
    });

    this.loadBalances(selected.account.id);
    this.loadSettlementSuggestions(selected.account.id);
    this.loadSettlements(selected.account.id);
  }

  private loadBalances(accountId: string) {
    this.balancesLoading.set(true);
    this.api.listAccountBalances(accountId).subscribe({
      next: (balances) => {
        this.accountBalances.set(balances);
        this.balancesLoading.set(false);
      },
      error: () => {
        this.accountBalances.set([]);
        this.balancesLoading.set(false);
      }
    });
  }

  private loadSettlementSuggestions(accountId: string) {
    this.suggestionsLoading.set(true);
    this.api.listAccountSettlementSuggestions(accountId).subscribe({
      next: (suggestions) => {
        this.settlementSuggestions.set(suggestions);
        this.suggestionsLoading.set(false);
      },
      error: () => {
        this.settlementSuggestions.set([]);
        this.suggestionsLoading.set(false);
      }
    });
  }

  private loadSettlements(accountId: string) {
    this.settlementsLoading.set(true);
    this.api.listAccountSettlements(accountId).subscribe({
      next: (settlements) => {
        this.accountSettlements.set(settlements);
        this.settlementsLoading.set(false);
      },
      error: () => {
        this.accountSettlements.set([]);
        this.settlementsLoading.set(false);
      }
    });
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
            this.renameAccountForm.reset({ name: membership.account.name });
            this.loadSharedAccountData();
            this.accountMessage.set(this.t('accounts_invite_accept_success'));
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { accountInvitationToken: null },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });
          },
          error: () => {
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

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: string) {
  return new Date(`${date}T00:00:00.000`).toISOString();
}
