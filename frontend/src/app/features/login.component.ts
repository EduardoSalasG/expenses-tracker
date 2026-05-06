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
    <main class="min-h-screen grid place-items-center px-4">
      <mat-card class="w-full max-w-md p-6">
        <h1 class="text-2xl font-semibold mb-2">Expenses Tracker</h1>
        <p class="text-sm text-slate-600 mb-6">Sign in with the WhatsApp number you use to track expenses.</p>

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

          <button mat-flat-button color="primary" type="submit">{{ otpSent() ? 'Verify' : 'Send code' }}</button>
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
