import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule],
  template: `
    <main class="app-surface grid min-h-screen place-items-center px-3 py-6 sm:px-4 sm:py-10">
      <mat-card class="page-panel w-full max-w-xl p-5 sm:p-7">
        <div class="mb-6">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded bg-brand-navy text-sm font-semibold text-white">ET</div>
          <h1 class="text-2xl font-semibold text-brand-ink sm:text-3xl">{{ t('login_title') }}</h1>
          <p class="mt-2 text-sm leading-6 text-brand-muted">
            {{ t('login_subtitle') }}
          </p>
          <div class="mt-4 inline-flex rounded-lg border border-brand-border bg-brand-surface-muted p-1">
            <button
              type="button"
              class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
              [class.bg-brand-blue]="mode() === 'login'"
              [class.text-white]="mode() === 'login'"
              [class.text-brand-ink]="mode() !== 'login'"
              (click)="setMode('login')">
              {{ t('login_mode_login') }}
            </button>
            <button
              type="button"
              class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
              [class.bg-brand-blue]="mode() === 'register'"
              [class.text-white]="mode() === 'register'"
              [class.text-brand-ink]="mode() !== 'register'"
              (click)="setMode('register')">
              {{ t('login_mode_register') }}
            </button>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4">
          @if (autoSigningIn()) {
            <div class="rounded border border-brand-border bg-brand-surface p-3 text-sm text-brand-muted">
              {{ t('login_auto_signing_in') }}
            </div>
          }
          @if (errorMessage()) {
            <div class="rounded border bg-[var(--semantic-danger-bg)] p-3 text-sm text-[var(--semantic-danger-text)] border-[var(--semantic-danger-border)]" role="alert" aria-live="assertive">
              {{ errorMessage() }}
            </div>
          }
          @if (magicLinkStatus()) {
            <div class="rounded border border-brand-border bg-brand-surface p-3 text-sm text-brand-muted" role="status" aria-live="polite">
              {{ magicLinkStatus() }}
            </div>
          }
          @if (linkingTelegram()) {
            <div class="rounded border border-brand-border bg-brand-surface p-3 text-sm text-brand-muted">
              {{ t('login_telegram_linking_hint') }}
            </div>
          }

          @if (mode() === 'login') {
            <section class="grid gap-4">
              <div class="auth-field">
                <label class="auth-label" for="login-phone">{{ t('login_phone') }}</label>
                <input
                  id="login-phone"
                  class="auth-input"
                  type="tel"
                  formControlName="phoneNumber"
                  [placeholder]="t('login_phone_placeholder')"
                  autocomplete="tel"
                  inputmode="tel"
                  [readOnly]="phoneLocked()">
                @if (form.controls.phoneNumber.touched && form.controls.phoneNumber.invalid) {
                  <div class="auth-error">{{ t('login_phone_error') }}</div>
                }
              </div>

              <div class="rounded-lg border border-brand-border bg-brand-surface p-3">
                <p class="mb-3 text-sm font-medium text-brand-ink">{{ t('login_method_title') }}</p>
                <div class="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    class="rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors"
                    [class.border-brand-blue]="loginMethod() === 'password'"
                    [class.bg-brand-surface-muted]="loginMethod() === 'password'"
                    [class.text-brand-ink]="loginMethod() === 'password'"
                    [class.border-brand-border]="loginMethod() !== 'password'"
                    [class.text-brand-muted]="loginMethod() !== 'password'"
                    (click)="setLoginMethod('password')">
                    {{ t('login_method_password') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors"
                    [class.border-brand-blue]="loginMethod() === 'magic-link'"
                    [class.bg-brand-surface-muted]="loginMethod() === 'magic-link'"
                    [class.text-brand-ink]="loginMethod() === 'magic-link'"
                    [class.border-brand-border]="loginMethod() !== 'magic-link'"
                    [class.text-brand-muted]="loginMethod() !== 'magic-link'"
                    (click)="setLoginMethod('magic-link')">
                    {{ t('login_method_magic_link') }}
                  </button>
                </div>
              </div>

              @if (loginMethod() === 'password') {
                <div class="auth-field">
                  <label class="auth-label" for="login-password">{{ t('login_password') }}</label>
                  <input
                    id="login-password"
                    class="auth-input"
                    type="password"
                    formControlName="password"
                    [placeholder]="t('login_password_placeholder')"
                    autocomplete="current-password">
                  @if (form.controls.password.touched && form.controls.password.invalid) {
                    <div class="auth-error">{{ t('login_password_error') }}</div>
                  }
                </div>
              } @else {
                <div class="rounded border border-brand-border bg-brand-surface p-4">
                  <p class="text-sm leading-6 text-brand-muted">{{ t('login_magic_link_hint') }}</p>
                </div>
              }

              <button mat-flat-button color="primary" type="submit" class="!h-11 w-full" [disabled]="autoSigningIn()">
                {{ loginMethod() === 'magic-link' ? t('login_send_magic_link') : t('landing_login') }}
              </button>
            </section>
          } @else {
            <section class="grid gap-4">
              <div class="rounded border border-brand-border bg-brand-surface p-4">
                <p class="text-sm text-brand-muted">{{ t('login_register_intro') }}</p>
                @if (linkingTelegram()) {
                  <p class="mt-3 text-sm leading-6 text-brand-muted">{{ t('login_register_telegram_connected') }}</p>
                }
              </div>

              @if (registerStep() === 1) {
                <div class="grid gap-4">
                  <div class="auth-field">
                    <label class="auth-label" for="register-first-name">{{ t('login_first_name') }}</label>
                    <input
                      id="register-first-name"
                      class="auth-input"
                      type="text"
                      formControlName="firstName"
                      [placeholder]="t('login_first_name_placeholder')"
                      autocomplete="given-name">
                    @if (showControlError('firstName')) {
                      <div class="auth-error">{{ t('login_first_name_error') }}</div>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-email">{{ t('login_email') }}</label>
                    <input
                      id="register-email"
                      class="auth-input"
                      type="email"
                      formControlName="email"
                      [placeholder]="t('login_email_placeholder')"
                      autocomplete="email">
                    @if (showControlError('email')) {
                      <div class="auth-error">{{ t('login_email_error') }}</div>
                    }
                  </div>

                  <button mat-flat-button color="primary" type="button" class="!h-11 w-full" (click)="advanceRegistrationStep()" [disabled]="autoSigningIn()">
                    {{ t('login_register_continue') }}
                  </button>
                </div>
              } @else {
                <div class="rounded-xl border border-brand-border bg-brand-surface p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div class="text-sm font-medium text-brand-ink">{{ form.controls.firstName.getRawValue() }}</div>
                      <div class="text-sm text-brand-muted">{{ form.controls.email.getRawValue() }}</div>
                    </div>
                    <button type="button" class="text-sm font-medium text-brand-blue" (click)="backToRegisterStepOne()">
                      {{ t('login_register_edit_step_one') }}
                    </button>
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="auth-field">
                    <label class="auth-label" for="register-last-name">{{ t('login_last_name') }}</label>
                    <input
                      id="register-last-name"
                      class="auth-input"
                      type="text"
                      formControlName="lastName"
                      [placeholder]="t('login_last_name_placeholder')"
                      autocomplete="family-name">
                    @if (showControlError('lastName')) {
                      <div class="auth-error">{{ t('login_last_name_error') }}</div>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-phone">{{ t('login_phone') }}</label>
                    <input
                      id="register-phone"
                      class="auth-input"
                      type="tel"
                      formControlName="phoneNumber"
                      [placeholder]="t('login_phone_placeholder')"
                      autocomplete="tel"
                      inputmode="tel"
                      [readOnly]="phoneLocked()">
                    @if (form.controls.phoneNumber.touched && form.controls.phoneNumber.invalid) {
                      <div class="auth-error">{{ t('login_phone_error') }}</div>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-country">{{ t('login_country') }}</label>
                    <input
                      id="register-country"
                      class="auth-input"
                      type="text"
                      formControlName="countryOfResidence"
                      [placeholder]="t('login_country_placeholder')"
                      autocomplete="country-name">
                    @if (showControlError('countryOfResidence')) {
                      <div class="auth-error">{{ t('login_country_error') }}</div>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-currency">{{ t('login_currency') }}</label>
                    <input
                      id="register-currency"
                      class="auth-input"
                      type="text"
                      formControlName="preferredCurrency"
                      [placeholder]="t('login_currency_placeholder')"
                      maxlength="3"
                      autocomplete="off">
                    @if (showControlError('preferredCurrency')) {
                      <div class="auth-error">{{ t('login_currency_error') }}</div>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-preferred-name">{{ t('login_preferred_name') }}</label>
                    <input
                      id="register-preferred-name"
                      class="auth-input"
                      type="text"
                      formControlName="preferredName"
                      [placeholder]="t('login_preferred_name_placeholder')"
                      autocomplete="nickname">
                    @if (showControlError('preferredName')) {
                      <div class="auth-error">{{ t('login_preferred_name_error') }}</div>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-language">{{ t('settings_language') }}</label>
                    <select id="register-language" class="auth-input auth-select" formControlName="preferredLanguage">
                      <option value="es">{{ t('settings_language_es') }}</option>
                      <option value="en">{{ t('settings_language_en') }}</option>
                    </select>
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-password">{{ t('login_password') }}</label>
                    <input
                      id="register-password"
                      class="auth-input"
                      type="password"
                      formControlName="password"
                      [placeholder]="t('login_password_placeholder')"
                      autocomplete="new-password">
                    @if (form.controls.password.touched && form.controls.password.invalid) {
                      <div class="auth-error">{{ t('login_password_error') }}</div>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-label" for="register-confirm-password">{{ t('login_confirm_password') }}</label>
                    <input
                      id="register-confirm-password"
                      class="auth-input"
                      type="password"
                      formControlName="confirmPassword"
                      [placeholder]="t('login_confirm_password_placeholder')"
                      autocomplete="new-password">
                    @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.invalid) {
                      <div class="auth-error">{{ t('login_confirm_password_error') }}</div>
                    }
                  </div>
                </div>

                <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" class="rounded-lg border border-brand-border px-4 py-3 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-surface-muted" (click)="backToRegisterStepOne()">
                    {{ t('login_register_back') }}
                  </button>
                  <button mat-flat-button color="primary" type="submit" class="!h-11 sm:min-w-44" [disabled]="autoSigningIn()">
                    {{ t('landing_register') }}
                  </button>
                </div>
              }
            </section>
          }
        </form>
      </mat-card>
    </main>
  `
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly errorMessage = signal('');
  readonly autoSigningIn = signal(false);
  readonly magicLinkStatus = signal('');
  readonly phoneLocked = signal(false);
  readonly telegramLocked = signal(false);
  readonly mode = signal<'login' | 'register'>('login');
  readonly loginMethod = signal<'password' | 'magic-link'>('password');
  readonly linkingTelegram = signal(false);
  readonly registerStep = signal<1 | 2>(1);
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
    this.i18n.usePublicSpanish();
    this.form.controls.preferredLanguage.setValue('es');
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'register') {
      this.mode.set('register');
    }
    const magicLinkToken = this.route.snapshot.queryParamMap.get('magicLinkToken');
    if (magicLinkToken) {
      this.autoSigningIn.set(true);
      this.auth.consumeMagicLinkToken(magicLinkToken).subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: () => {
          this.autoSigningIn.set(false);
          this.errorMessage.set(this.t('login_magic_link_invalid'));
        }
      });
      return;
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
        this.errorMessage.set(this.t('login_telegram_link_invalid'));
      }
    });
  }

  submit() {
    const value = this.form.getRawValue();
    this.errorMessage.set('');
    this.magicLinkStatus.set('');

    if (this.mode() === 'login') {
      if (this.form.controls.phoneNumber.invalid) {
        this.form.controls.phoneNumber.markAsTouched();
        return;
      }

      if (this.loginMethod() === 'magic-link') {
        this.sendMagicLink();
        return;
      }

      if (this.form.controls.password.invalid) {
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

    if (this.registerStep() === 1) {
      this.advanceRegistrationStep();
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

  advanceRegistrationStep() {
    this.errorMessage.set('');
    this.form.controls.firstName.setValidators([Validators.required]);
    this.form.controls.email.setValidators([Validators.required, Validators.email]);
    this.form.controls.firstName.updateValueAndValidity();
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.firstName.markAsTouched();
    this.form.controls.email.markAsTouched();

    if (this.form.controls.firstName.invalid || this.form.controls.email.invalid) {
      return;
    }

    if (!this.form.controls.preferredName.getRawValue()) {
      this.form.controls.preferredName.setValue(this.form.controls.firstName.getRawValue());
    }

    const value = this.form.getRawValue();
    this.auth.saveRegistrationLead({
      firstName: value.firstName,
      email: value.email,
      preferredLanguage: value.preferredLanguage,
      phoneNumber: value.phoneNumber || undefined
    }).subscribe({
      next: () => {
        this.registerStep.set(2);
      },
      error: (error) => {
        this.errorMessage.set(this.toErrorMessage(error, this.t('login_register_lead_error')));
      }
    });
  }

  backToRegisterStepOne() {
    this.registerStep.set(1);
    this.errorMessage.set('');
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
    this.magicLinkStatus.set('');
    this.registerStep.set(1);
    if (mode === 'login') {
      this.loginMethod.set('password');
    }
    this.applyRegistrationValidators(mode === 'register' && this.registerStep() === 2);
    this.form.controls.password.reset('');
    this.form.controls.confirmPassword.clearValidators();
    this.form.controls.confirmPassword.updateValueAndValidity();
    this.form.controls.confirmPassword.reset('');
  }

  setLoginMethod(method: 'password' | 'magic-link') {
    this.loginMethod.set(method);
    this.errorMessage.set('');
    this.magicLinkStatus.set('');
    this.form.controls.password.markAsUntouched();
  }

  private toErrorMessage(error: unknown, fallback: string) {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return this.translatePublicErrorMessage(error.error.error);
    }

    return fallback;
  }

  private translatePublicErrorMessage(message: string) {
    const translations: Record<string, string> = {
      'No account found for that phone number.': this.t('login_error_no_account'),
      'This account has no email configured. Sign in with your password and add an email in Settings first.': this.t('login_error_no_email'),
      'Could not send magic link email.': this.t('login_error_magic_link_send'),
      'Invalid or expired magic link token.': this.t('login_magic_link_invalid'),
      'Invalid phone number or password.': this.t('login_error_invalid_credentials_backend'),
      'Phone number is already registered. Please log in.': this.t('login_error_phone_registered')
    };
    return translations[message] ?? message;
  }

  sendMagicLink() {
    this.errorMessage.set('');
    this.magicLinkStatus.set('');
    if (this.form.controls.phoneNumber.invalid) {
      this.form.controls.phoneNumber.markAsTouched();
      return;
    }

    this.auth.requestMagicLink(this.form.controls.phoneNumber.getRawValue()).subscribe({
      next: (response) => {
        this.magicLinkStatus.set(this.t('login_magic_link_sent').replace('{email}', response.email));
      },
      error: (error) => {
        this.errorMessage.set(this.toErrorMessage(error, this.t('login_magic_link_error')));
      }
    });
  }

  showControlError(controlName: 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency') {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  t(key: string) {
    return this.i18n.t(key);
  }
}
