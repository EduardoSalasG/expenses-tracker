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
            <mat-form-field appearance="outline">
              <mat-label>Verification code</mat-label>
              <input matInput formControlName="code" placeholder="123456">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Preferred currency</mat-label>
              <input matInput formControlName="preferredCurrency" maxlength="3">
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
  readonly form = this.fb.nonNullable.group({
    phoneNumber: ['', [Validators.required, Validators.minLength(8)]],
    code: [''],
    name: [''],
    preferredCurrency: ['USD']
  });

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  submit() {
    const value = this.form.getRawValue();
    if (!this.otpSent()) {
      this.auth.requestOtp(value.phoneNumber).subscribe(() => this.otpSent.set(true));
      return;
    }

    this.auth.verifyOtp(value).subscribe(() => this.router.navigateByUrl('/dashboard'));
  }
}
