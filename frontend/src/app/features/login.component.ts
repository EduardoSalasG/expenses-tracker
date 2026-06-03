import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
  template: `
    <main class="app-surface grid min-h-screen place-items-center px-3 py-6 sm:px-4 sm:py-10">
      <mat-card class="page-panel w-full max-w-md p-5 sm:p-7">
        <div class="mb-6">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded bg-brand-navy text-sm font-semibold text-white">ET</div>
          <h1 class="text-2xl font-semibold text-brand-ink sm:text-3xl">{{ t('login_title') }}</h1>
          <p class="mt-2 text-sm leading-6 text-brand-muted">
            {{ t('login_subtitle') }}
          </p>
          <div class="mt-4 inline-flex rounded-lg border border-brand-border bg-brand-surface-muted p-1">
            <button type="button" class="rounded-md px-4 py-2 text-sm font-medium transition-colors" [class.bg-brand-blue]="mode() === 'login'" [class.text-white]="mode() === 'login'" [class.text-brand-ink]="mode() !== 'login'" (click)="setMode('login')">
              {{ t('login_mode_login') }}
            </button>
            <button type="button" class="rounded-md px-4 py-2 text-sm font-medium transition-colors" [class.bg-brand-blue]="mode() === 'register'" [class.text-white]="mode() === 'register'" [class.text-brand-ink]="mode() !== 'register'" (click)="setMode('register')">
              {{ t('login_mode_register') }}
            </button>
          </div>
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

          @if (linkingTelegram()) {
            <div class="rounded border border-brand-border bg-brand-surface p-3 text-sm text-brand-muted">
              {{ t('login_telegram_linking_hint') }}
            </div>
          }

          @if (mode() === 'login') {
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_password') }}</mat-label>
              <input matInput formControlName="password" type="password" autocomplete="current-password">
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>{{ t('login_password_error') }}</mat-error>
              }
            </mat-form-field>
          }

          @if (mode() === 'register') {
            <div class="rounded border border-brand-border bg-brand-surface p-4">
              <p class="text-sm text-brand-muted">{{ t('login_register_intro') }}</p>
              @if (linkingTelegram()) {
                <p class="mt-3 text-sm leading-6 text-brand-muted">{{ t('login_register_telegram_connected') }}</p>
              }
            </div>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_first_name') }}</mat-label>
              <input matInput formControlName="firstName" autocomplete="given-name">
              @if (showControlError('firstName')) {
                <mat-error>{{ t('login_first_name_error') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_last_name') }}</mat-label>
              <input matInput formControlName="lastName" autocomplete="family-name">
              @if (showControlError('lastName')) {
                <mat-error>{{ t('login_last_name_error') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_email') }}</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email">
              @if (showControlError('email')) {
                <mat-error>{{ t('login_email_error') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_country') }}</mat-label>
              <input matInput formControlName="countryOfResidence" autocomplete="country-name">
              @if (showControlError('countryOfResidence')) {
                <mat-error>{{ t('login_country_error') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_currency') }}</mat-label>
              <input matInput formControlName="preferredCurrency" maxlength="3" placeholder="CLP" autocomplete="off">
              @if (showControlError('preferredCurrency')) {
                <mat-error>{{ t('login_currency_error') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_preferred_name') }}</mat-label>
              <input matInput formControlName="preferredName" autocomplete="nickname">
              @if (showControlError('preferredName')) {
                <mat-error>{{ t('login_preferred_name_error') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('settings_language') }}</mat-label>
              <mat-select formControlName="preferredLanguage">
                <mat-option value="es">{{ t('settings_language_es') }}</mat-option>
                <mat-option value="en">{{ t('settings_language_en') }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_password') }}</mat-label>
              <input matInput formControlName="password" type="password" autocomplete="new-password">
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>{{ t('login_password_error') }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('login_confirm_password') }}</mat-label>
              <input matInput formControlName="confirmPassword" type="password" autocomplete="new-password">
              @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.invalid) {
                <mat-error>{{ t('login_confirm_password_error') }}</mat-error>
              }
            </mat-form-field>
          }

          <button mat-flat-button color="primary" type="submit" class="!h-11 w-full" [disabled]="autoSigningIn()">
            {{ mode() === 'register' ? t('landing_register') : t('landing_login') }}
          </button>
        </form>
      </mat-card>
    </main>
  `
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly errorMessage = signal('');
  readonly autoSigningIn = signal(false);
  readonly phoneLocked = signal(false);
  readonly telegramLocked = signal(false);
  readonly mode = signal<'login' | 'register'>('login');
  readonly linkingTelegram = signal(false);
  readonly form = this.fb.nonNullable.group({
    phoneNumber: ['', [Validators.required, Validators.minLength(8)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: [''],
    firstName: [''],
    lastName: [''],
    preferredName: [''],
    email: [''],
    countryOfResidence: [''],
    preferredCurrency: ['CLP'],
    preferredLanguage: ['es' as 'es' | 'en'],
    telegramChatId: ['']
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
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'register') {
      this.mode.set('register');
    }
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
        this.linkingTelegram.set(true);
        if (payload.phoneNumber) {
          this.form.controls.phoneNumber.setValue(payload.phoneNumber);
          this.phoneLocked.set(true);
          this.mode.set('register');
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
    const value = this.form.getRawValue();
    this.errorMessage.set('');

    if (this.mode() === 'login') {
      if (this.form.controls.phoneNumber.invalid || this.form.controls.password.invalid) {
        this.form.controls.phoneNumber.markAsTouched();
        this.form.controls.password.markAsTouched();
        return;
      }

      this.auth.loginWeb({
        phoneNumber: value.phoneNumber,
        password: value.password,
        telegramChatId: value.telegramChatId || undefined
      }).subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: (error) => {
          this.errorMessage.set(this.toErrorMessage(error, this.t('login_invalid_credentials')));
        }
      });
      return;
    }

    this.applyRegistrationValidators(true);
    this.form.controls.confirmPassword.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.confirmPassword.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (value.password !== value.confirmPassword) {
      this.errorMessage.set(this.t('login_password_mismatch'));
      this.form.controls.confirmPassword.markAsTouched();
      return;
    }

    this.auth.registerWeb({
      phoneNumber: value.phoneNumber,
      password: value.password,
      firstName: value.firstName,
      lastName: value.lastName,
      preferredName: value.preferredName || value.firstName,
      email: value.email || undefined,
      countryOfResidence: value.countryOfResidence,
      preferredCurrency: value.preferredCurrency.toUpperCase(),
      preferredLanguage: value.preferredLanguage,
      telegramChatId: value.telegramChatId || undefined
    }).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (error) => {
        this.errorMessage.set(this.toErrorMessage(error, this.t('login_register_error')));
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

    controls.forEach((control) => control.updateValueAndValidity());
  }

  setMode(mode: 'login' | 'register') {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.applyRegistrationValidators(mode === 'register');
    this.form.controls.password.reset('');
    this.form.controls.confirmPassword.clearValidators();
    this.form.controls.confirmPassword.updateValueAndValidity();
    this.form.controls.confirmPassword.reset('');
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
