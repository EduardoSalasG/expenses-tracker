import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <main class="app-surface grid min-h-screen place-items-center px-3 py-6 sm:px-4 sm:py-10">
      <mat-card class="page-panel w-full max-w-md p-5 sm:p-7">
        <div class="mb-6">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded bg-brand-navy text-sm font-semibold text-white">ET</div>
          <h1 class="text-2xl font-semibold text-brand-ink sm:text-3xl">{{ t('login_title') }}</h1>
          <p class="mt-2 text-sm leading-6 text-brand-muted">
            {{ t('login_subtitle') }}
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4">
          @if (autoSigningIn()) {
            <div class="rounded border border-brand-border bg-brand-surface p-3 text-sm text-brand-muted">
              Signing you in from Telegram...
            </div>
          }
          @if (errorMessage()) {
            <div class="rounded border bg-[var(--semantic-danger-bg)] p-3 text-sm text-[var(--semantic-danger-text)] border-[var(--semantic-danger-border)]" role="alert" aria-live="assertive">
              {{ errorMessage() }}
            </div>
          }

          <mat-form-field appearance="outline">
            <mat-label>{{ t('login_phone') }}</mat-label>
            <input matInput formControlName="phoneNumber" placeholder="+56912345678" autocomplete="tel" inputmode="tel" [readonly]="phoneLocked()">
            @if (form.controls.phoneNumber.touched && form.controls.phoneNumber.invalid) {
              <mat-error>Enter a valid phone number.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ t('login_telegram_chat_id') }}</mat-label>
            <input matInput formControlName="telegramChatId" placeholder="123456789" autocomplete="off" [readonly]="telegramLocked()">
            @if (form.controls.telegramChatId.touched && form.controls.telegramChatId.invalid) {
              <mat-error>{{ t('login_telegram_chat_id_error') }}</mat-error>
            }
          </mat-form-field>

          @if (otpSent()) {
            @if (debugCode()) {
              <div class="rounded border bg-[var(--semantic-warning-bg)] p-3 text-sm text-[var(--semantic-warning-text)] border-[var(--semantic-warning-border)]">
                Local OTP code: <strong>{{ debugCode() }}</strong>
              </div>
            }
            @if (requiresRegistration()) {
              <div class="rounded border border-brand-border bg-brand-surface p-4">
                <p class="text-sm font-medium text-brand-ink">Create your profile</p>
                <p class="mt-1 text-xs text-brand-muted">This number is not registered yet.</p>
              </div>
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput formControlName="firstName" autocomplete="given-name">
                @if (showControlError('firstName')) {
                  <mat-error>Name is required.</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Last name</mat-label>
                <input matInput formControlName="lastName" autocomplete="family-name">
                @if (showControlError('lastName')) {
                  <mat-error>Last name is required.</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" autocomplete="email">
                @if (showControlError('email')) {
                  <mat-error>Enter a valid email.</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Country</mat-label>
                <input matInput formControlName="countryOfResidence" placeholder="Chile" autocomplete="country-name">
                @if (showControlError('countryOfResidence')) {
                  <mat-error>Country is required.</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Preferred currency</mat-label>
                <input matInput formControlName="preferredCurrency" maxlength="3" placeholder="CLP" autocomplete="off">
                @if (showControlError('preferredCurrency')) {
                  <mat-error>Use a 3-letter currency code.</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Preferred name</mat-label>
                <input matInput formControlName="preferredName" placeholder="How should we call you?" autocomplete="nickname">
                @if (showControlError('preferredName')) {
                  <mat-error>Preferred name is required.</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('settings_language') }}</mat-label>
                <mat-select formControlName="preferredLanguage">
                  <mat-option value="es">{{ t('settings_language_es') }}</mat-option>
                  <mat-option value="en">{{ t('settings_language_en') }}</mat-option>
                </mat-select>
              </mat-form-field>
            }
            <mat-form-field appearance="outline">
              <mat-label>Verification code</mat-label>
              <input matInput formControlName="code" placeholder="123456" inputmode="numeric" autocomplete="one-time-code">
              @if (form.controls.code.touched && form.controls.code.invalid) {
                <mat-error>Enter the 6-digit code.</mat-error>
              }
            </mat-form-field>
          }

          <button mat-flat-button color="primary" type="submit" class="!h-11 w-full" [disabled]="autoSigningIn()">
            {{ otpSent() ? t('login_verify_enter') : t('login_send_code') }}
          </button>
        </form>
      </mat-card>
    </main>
  `
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly otpSent = signal(false);
  readonly requiresRegistration = signal(false);
  readonly debugCode = signal('');
  readonly errorMessage = signal('');
  readonly autoSigningIn = signal(false);
  readonly phoneLocked = signal(false);
  readonly telegramLocked = signal(false);
  readonly otpRequestInFlight = signal(false);
  readonly form = this.fb.nonNullable.group({
    phoneNumber: ['', [Validators.required, Validators.minLength(8)]],
    code: [''],
    firstName: [''],
    lastName: [''],
    preferredName: [''],
    email: [''],
    countryOfResidence: [''],
    preferredCurrency: ['CLP'],
    preferredLanguage: ['es' as 'es' | 'en'],
    telegramChatId: ['', [Validators.required, Validators.minLength(2)]]
  });

  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly i18n: I18nService
  ) {
    this.form.controls.preferredLanguage.setValue(this.i18n.language());
  }

  ngOnInit() {
    const linkToken = this.route.snapshot.queryParamMap.get('linkToken');
    if (!linkToken) return;
    this.autoSigningIn.set(true);
    this.auth.consumeTelegramLinkToken(linkToken).subscribe({
      next: (payload) => {
        if (payload.linkedUser) {
          this.router.navigateByUrl('/dashboard');
          return;
        }

        this.form.controls.telegramChatId.setValue(payload.telegramChatId);
        this.telegramLocked.set(true);
        if (payload.phoneNumber) {
          this.form.controls.phoneNumber.setValue(payload.phoneNumber);
          this.phoneLocked.set(true);
          this.requestOtpFromTelegramLink();
          return;
        }
        this.autoSigningIn.set(false);
      },
      error: () => {
        this.autoSigningIn.set(false);
        this.errorMessage.set('Invalid or expired Telegram link token. Please return to Telegram and tap start again.');
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.errorMessage.set('');

    if (!this.otpSent()) {
      this.requestOtp();
      return;
    }

    const payload = this.requiresRegistration()
      ? {
        phoneNumber: value.phoneNumber,
        code: value.code,
        firstName: value.firstName,
        lastName: value.lastName,
        preferredName: value.preferredName || value.firstName,
        email: value.email,
        countryOfResidence: value.countryOfResidence,
        preferredCurrency: value.preferredCurrency.toUpperCase(),
        preferredLanguage: value.preferredLanguage,
        telegramChatId: value.telegramChatId || undefined
      }
      : {
        phoneNumber: value.phoneNumber,
        code: value.code,
        telegramChatId: value.telegramChatId || undefined
      };

    this.auth.verifyOtp(payload).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (error) => {
        this.errorMessage.set(this.toErrorMessage(error, 'Could not verify the code.'));
      }
    });
  }

  private applyRegistrationValidators(required: boolean) {
    const controls = [
      this.form.controls.firstName,
      this.form.controls.lastName,
      this.form.controls.email,
      this.form.controls.countryOfResidence,
      this.form.controls.preferredCurrency,
      this.form.controls.preferredName
    ];
    for (const control of controls) {
      control.clearValidators();
    }

    if (required) {
      this.form.controls.firstName.addValidators([Validators.required]);
      this.form.controls.lastName.addValidators([Validators.required]);
      this.form.controls.email.addValidators([Validators.required, Validators.email]);
      this.form.controls.countryOfResidence.addValidators([Validators.required, Validators.minLength(2)]);
      this.form.controls.preferredCurrency.addValidators([Validators.required, Validators.minLength(3), Validators.maxLength(3)]);
      this.form.controls.preferredName.addValidators([Validators.required]);
    }

    this.form.controls.code.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
    [...controls, this.form.controls.code].forEach((control) => control.updateValueAndValidity());
  }

  private requestOtp() {
    if (this.otpRequestInFlight()) return;

    const value = this.form.getRawValue();
    this.otpRequestInFlight.set(true);
    this.auth.requestOtpWithTelegram(value.phoneNumber, value.telegramChatId || undefined).subscribe({
      next: (response) => {
        this.requiresRegistration.set(response.requiresRegistration);
        this.debugCode.set(response.debugCode ?? '');
        this.otpSent.set(true);
        this.applyRegistrationValidators(response.requiresRegistration);
        this.otpRequestInFlight.set(false);
        this.autoSigningIn.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.toErrorMessage(error, 'Could not send the verification code.'));
        this.otpRequestInFlight.set(false);
        this.autoSigningIn.set(false);
      }
    });
  }

  private requestOtpFromTelegramLink() {
    this.errorMessage.set('');
    if (this.form.controls.phoneNumber.invalid || this.form.controls.telegramChatId.invalid) return;
    this.requestOtp();
  }

  private toErrorMessage(error: unknown, fallback: string) {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }

    return fallback;
  }

  showControlError(controlName: 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency') {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  t(key: string) {
    return this.i18n.t(key);
  }
}
