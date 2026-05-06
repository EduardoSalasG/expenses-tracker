import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    name: string;
    phoneNumber: string;
    preferredCurrency: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'expenses_tracker_access_token';
  private readonly refreshTokenKey = 'expenses_tracker_refresh_token';
  readonly user = signal<VerifyOtpResponse['user'] | null>(null);

  constructor(private readonly http: HttpClient) {}

  get accessToken() {
    return localStorage.getItem(this.tokenKey);
  }

  get refreshTokenValue() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  requestOtp(phoneNumber: string) {
    return this.http.post(`${environment.apiBaseUrl}/auth/otp/request`, { phoneNumber });
  }

  verifyOtp(payload: { phoneNumber: string; code: string; name?: string; preferredCurrency?: string }) {
    return this.http.post<VerifyOtpResponse>(`${environment.apiBaseUrl}/auth/otp/verify`, payload).pipe(
      tap((response) => {
        this.storeSession(response);
      })
    );
  }

  refreshSession() {
    return this.http.post<VerifyOtpResponse>(`${environment.apiBaseUrl}/auth/refresh`, {
      refreshToken: this.refreshTokenValue
    }).pipe(
      tap((response) => {
        this.storeSession(response);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.user.set(null);
  }

  private storeSession(response: VerifyOtpResponse) {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    this.user.set(response.user);
  }
}
