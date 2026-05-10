import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService, type CurrentUser, type ReportFrequency } from '../core/api.service';
import { PageHeaderComponent } from '../shared/components/page-header.component';

const frequencies: Array<{ key: ReportFrequency; label: string; description: string }> = [
  { key: 'daily', label: 'Daily', description: 'A compact daily WhatsApp summary.' },
  { key: 'weekly', label: 'Weekly', description: 'A weekly rhythm for category trends.' },
  { key: 'monthly', label: 'Monthly', description: 'A month-end budget and cash-flow summary.' },
  { key: 'yearly', label: 'Yearly', description: 'A long-range yearly recap.' }
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
    PageHeaderComponent
  ],
  template: `
    <app-page-header title="Settings" eyebrow="Profile and WhatsApp report preferences">
      <button mat-stroked-button type="button" (click)="load()">Refresh</button>
    </app-page-header>

    <section class="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <mat-card class="page-panel p-5">
        <h2 class="mb-4 text-lg font-semibold text-slate-950">Profile</h2>
        @if (user()) {
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="grid gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="firstName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Last name</mat-label>
              <input matInput formControlName="lastName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Preferred name</mat-label>
              <input matInput formControlName="preferredName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput [value]="user()?.phoneNumber" disabled />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Country of residence</mat-label>
              <input matInput formControlName="countryOfResidence" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Preferred currency</mat-label>
              <input matInput formControlName="preferredCurrency" maxlength="3" />
            </mat-form-field>

            <div class="flex items-center gap-3">
              <button mat-flat-button color="primary" type="submit" [disabled]="profileForm.invalid || savingProfile()">Save profile</button>
              @if (profileMessage()) {
                <span class="text-sm text-slate-600">{{ profileMessage() }}</span>
              }
            </div>
          </form>
        } @else {
          <p class="text-sm text-slate-500">Loading profile...</p>
        }
      </mat-card>

      <mat-card class="page-panel p-5">
        <h2 class="mb-2 text-lg font-semibold text-slate-950">Report delivery</h2>
        <p class="mb-4 text-sm text-slate-500">Choose which dashboard reports should be delivered through WhatsApp.</p>

        <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-3">
          @for (frequency of frequencies; track frequency.key) {
            <label class="rounded border border-slate-200 bg-white p-3 shadow-sm">
              <mat-checkbox [formControlName]="frequency.key">{{ frequency.label }}</mat-checkbox>
              <div class="ml-10 text-sm text-slate-500">{{ frequency.description }}</div>
            </label>
          }

          <div class="mt-2 flex items-center gap-3">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">Save preferences</button>
            @if (message()) {
              <span class="text-sm text-slate-600">{{ message() }}</span>
            }
          </div>
        </form>
      </mat-card>
    </section>
  `
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly frequencies = frequencies;
  readonly user = signal<CurrentUser | null>(null);
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
    preferredCurrency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
  });
  readonly form = this.fb.nonNullable.group({
    daily: [false],
    weekly: [false],
    monthly: [true],
    yearly: [false]
  });

  constructor(private readonly api: ApiService) {
    this.load();
  }

  load() {
    this.api.me().subscribe((user) => {
      this.user.set(user);
      this.profileForm.setValue({
        firstName: user.firstName,
        lastName: user.lastName,
        preferredName: user.preferredName,
        email: user.email ?? '',
        countryOfResidence: user.countryOfResidence,
        preferredCurrency: user.preferredCurrency
      });
      this.form.setValue({
        daily: user.reportPreferences.includes('daily'),
        weekly: user.reportPreferences.includes('weekly'),
        monthly: user.reportPreferences.includes('monthly'),
        yearly: user.reportPreferences.includes('yearly')
      });
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    const value = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.profileMessage.set('');
    this.api.updateMe({
      ...value,
      preferredCurrency: value.preferredCurrency.toUpperCase()
    }).subscribe({
      next: (user) => {
        this.savingProfile.set(false);
        this.user.set(user);
        this.profileMessage.set('Profile saved.');
      },
      error: () => {
        this.savingProfile.set(false);
        this.profileMessage.set('Could not save profile.');
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
        this.message.set('Report preferences saved.');
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.message.set('Could not save report preferences.');
      }
    });
  }
}
