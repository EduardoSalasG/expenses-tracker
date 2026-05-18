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
import { ApiService, type CurrentUser, type ReportFrequency } from '../core/api.service';
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

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  t(key: string) {
    return this.i18n.t(key);
  }
}
