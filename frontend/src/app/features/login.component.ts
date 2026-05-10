import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="app-surface min-h-screen grid place-items-center px-4 py-10">
      <mat-card class="page-panel w-full max-w-md p-7">
        <div class="mb-6">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded bg-slate-950 text-sm font-semibold text-white">ET</div>
          <h1 class="text-3xl font-semibold text-slate-950">Expenses Tracker</h1>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            Sign in with the WhatsApp number you use to track expenses.
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4">
          <mat-form-field appearance="outline">
            <mat-label>WhatsApp phone number</mat-label>
            <input matInput formControlName="phoneNumber" placeholder="+56912345678">
          </mat-form-field>

          @if (otpSent()) {
            @if (requiresRegistration()) {
              <div class="rounded border border-slate-200 bg-white p-4">
                <p class="text-sm font-medium text-slate-950">Create your profile</p>
                <p class="mt-1 text-xs text-slate-500">This number is not registered yet.</p>
              </div>
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput formControlName="firstName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Last name</mat-label>
                <input matInput formControlName="lastName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Country</mat-label>
                <input matInput formControlName="countryOfResidence" placeholder="Chile">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Preferred currency</mat-label>
                <input matInput formControlName="preferredCurrency" maxlength="3" placeholder="CLP">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Preferred name</mat-label>
                <input matInput formControlName="preferredName" placeholder="How should we call you?">
              </mat-form-field>
            }
            <mat-form-field appearance="outline">
              <mat-label>Verification code</mat-label>
              <input matInput formControlName="code" placeholder="123456">
            </mat-form-field>
          }

          <button mat-flat-button color="primary" type="submit" class="!h-11">
            {{ otpSent() ? 'Verify and enter' : 'Send code' }}
          </button>
        </form>
      </mat-card>
    </main>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly otpSent = signal(false);
  readonly requiresRegistration = signal(false);
  readonly form = this.fb.nonNullable.group({
    phoneNumber: ['', [Validators.required, Validators.minLength(8)]],
    code: [''],
    firstName: [''],
    lastName: [''],
    preferredName: [''],
    email: [''],
    countryOfResidence: [''],
    preferredCurrency: ['CLP']
  });

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (!this.otpSent()) {
      this.auth.requestOtp(value.phoneNumber).subscribe((response) => {
        this.requiresRegistration.set(response.requiresRegistration);
        this.otpSent.set(true);
        this.applyRegistrationValidators(response.requiresRegistration);
      });
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
        preferredCurrency: value.preferredCurrency.toUpperCase()
      }
      : {
        phoneNumber: value.phoneNumber,
        code: value.code
      };

    this.auth.verifyOtp(payload).subscribe(() => this.router.navigateByUrl('/dashboard'));
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
}
