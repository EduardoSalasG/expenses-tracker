import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AccountContextService } from '../../core/account-context.service';
import { ApiService, type FinancialAccountMembership } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { FeedbackBannerComponent } from './feedback-banner.component';

export interface AccountCreateDialogResult {
  createdAccountId?: string;
}

@Component({
  selector: 'app-account-create-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FeedbackBannerComponent
  ],
  template: `
    <div class="brand-dialog-shell account-create-dialog">
      <div class="brand-dialog-header flex items-start justify-between gap-4">
        <div>
          <h2 class="m-0 text-2xl font-semibold text-brand-ink">{{ t('accounts_create_title') }}</h2>
          <p class="mt-2 text-sm leading-6 text-brand-muted">{{ t('accounts_create_modal_hint') }}</p>
        </div>
        <button
          mat-icon-button
          type="button"
          class="!h-10 !w-10 !text-brand-muted"
          [attr.aria-label]="t('common_close')"
          (click)="close()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="brand-dialog-form pt-2">
        <div class="brand-dialog-fields">
          @if (!createdMembership()) {
              <form [formGroup]="createAccountForm" (ngSubmit)="createAccount()" class="grid gap-4 pt-4">
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ t('accounts_name') }}</mat-label>
                  <input matInput id="account-dialog-name" name="accountDialogName" formControlName="name" />
                </mat-form-field>

                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ t('accounts_currency') }}</mat-label>
                  <input matInput id="account-dialog-currency" name="accountDialogCurrency" formControlName="currency" maxlength="3" />
                </mat-form-field>

              <app-feedback-banner [message]="accountMessage()" [tone]="feedbackTone(accountMessage())" />
            </form>
          } @else {
            <div class="grid gap-4">
              <div class="rounded-xl border border-brand-border bg-brand-surface-muted px-4 py-3">
                <div class="text-sm font-medium text-brand-ink">{{ createdMembership()?.account?.name }}</div>
                <div class="mt-1 text-sm text-brand-muted">
                  {{ t('accounts_type_shared') }} · {{ createdMembership()?.account?.currency }}
                </div>
              </div>

              <form [formGroup]="inviteForm" (ngSubmit)="inviteMember()" class="grid gap-4 pt-2">
                <div class="text-sm font-medium text-brand-ink">{{ t('accounts_invite_title') }}</div>
                <p class="text-sm text-brand-muted">{{ t('accounts_create_invite_hint') }}</p>

                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ t('login_email') }}</mat-label>
                  <input matInput id="account-dialog-invite-email" name="accountDialogInviteEmail" formControlName="email" type="email" />
                </mat-form-field>

                <app-feedback-banner [message]="inviteMessage()" [tone]="feedbackTone(inviteMessage())" />

                @if (lastInvitationLink()) {
                  <div class="rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
                    <div class="text-sm font-medium text-brand-ink">{{ t('accounts_invite_link_title') }}</div>
                    <div class="mt-1 break-all text-sm text-brand-muted">{{ lastInvitationLink() }}</div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <button mat-stroked-button type="button" class="!border-brand-border !text-brand-ink" (click)="copyInvitationLink()">
                        {{ t('accounts_invite_copy') }}
                      </button>
                    </div>
                  </div>
                }
              </form>
            </div>
          }
        </div>

        <div class="brand-dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          @if (!createdMembership()) {
            <button mat-button type="button" (click)="close()">{{ t('common_cancel') }}</button>
            <button mat-flat-button color="primary" type="button" [disabled]="createAccountForm.invalid || savingAccount()" (click)="createAccount()">
              {{ t('accounts_create_action') }}
            </button>
          } @else {
            <button mat-button type="button" (click)="close()">{{ t('accounts_modal_finish') }}</button>
            <button mat-flat-button color="primary" type="button" [disabled]="inviteForm.invalid || savingInvitation()" (click)="inviteMember()">
              {{ t('accounts_invite_action') }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      color: var(--brand-ink);
    }

    .brand-dialog-shell {
      display: flex;
      height: auto;
      max-height: calc(100vh - 3rem);
      flex-direction: column;
      gap: 1rem;
      overflow: auto;
      padding: 1.25rem;
    }

    .brand-dialog-header {
      padding-right: 0.5rem;
    }

    .brand-dialog-fields {
      padding-top: 0.25rem;
    }

    .account-create-dialog .brand-dialog-form,
    .account-create-dialog .brand-dialog-fields {
      flex: 0 0 auto;
      overflow: visible;
      padding-bottom: 0;
      padding-right: 0;
    }

    .account-create-dialog .brand-dialog-actions {
      position: static;
      margin-top: 0;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .brand-dialog-shell {
        max-height: calc(100vh - 1.5rem);
        padding: 1rem;
      }
    }
  `]
})
export class AccountCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly accountService = inject(AccountContextService);
  private readonly i18n = inject(I18nService);

  readonly createAccountForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
  });

  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly savingAccount = signal(false);
  readonly savingInvitation = signal(false);
  readonly accountMessage = signal('');
  readonly inviteMessage = signal('');
  readonly createdMembership = signal<FinancialAccountMembership | null>(null);
  readonly lastInvitationLink = signal('');

  constructor(readonly dialogRef: MatDialogRef<AccountCreateDialogComponent, AccountCreateDialogResult | undefined>) {}

  t(key: string) {
    return this.i18n.t(key);
  }

  close() {
    this.dialogRef.close({
      createdAccountId: this.createdMembership()?.account.id
    });
  }

  createAccount() {
    if (this.createAccountForm.invalid || this.savingAccount()) return;
    const value = this.createAccountForm.getRawValue();
    this.savingAccount.set(true);
    this.accountMessage.set('');
    this.api.createAccount({
      name: value.name.trim(),
      currency: value.currency.trim().toUpperCase()
    }).subscribe({
      next: (membership) => {
        this.accountService.insertAccount(membership);
        this.createdMembership.set(membership);
        this.savingAccount.set(false);
        this.accountMessage.set(this.t('accounts_create_success'));
      },
      error: () => {
        this.savingAccount.set(false);
        this.accountMessage.set(this.t('accounts_create_error'));
      }
    });
  }

  inviteMember() {
    const membership = this.createdMembership();
    if (!membership || this.inviteForm.invalid || this.savingInvitation()) return;
    const value = this.inviteForm.getRawValue();
    this.savingInvitation.set(true);
    this.inviteMessage.set('');
    this.api.createAccountInvitation(membership.account.id, {
      email: value.email.trim()
    }).subscribe({
      next: (invitation) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        this.lastInvitationLink.set(`${origin}/settings?accountInvitationToken=${encodeURIComponent(invitation.token)}`);
        this.inviteForm.reset({ email: '' });
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
      () => this.inviteMessage.set(this.t('accounts_invite_copy_success')),
      () => this.inviteMessage.set(this.t('accounts_invite_copy_error'))
    );
  }

  feedbackTone(message: string) {
    return message.includes('No se pudo') || message.includes('Could not') ? 'error' : 'success';
  }
}
