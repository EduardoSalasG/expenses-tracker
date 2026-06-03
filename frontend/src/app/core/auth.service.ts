import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { I18nService } from './i18n.service';

interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    firstName: string;
    lastName: string;
    preferredName: string;
    phoneNumber: string;
    preferredCurrency: string;
    preferredLanguage?: 'es' | 'en';
  };
}

interface TelegramLinkSessionResponse extends VerifyOtpResponse {
  telegramChatId: string;
  phoneNumber: string;
  linkedUser: true;
}

interface TelegramLinkRegistrationResponse {
  telegramChatId: string;
  phoneNumber?: string;
  linkedUser: false;
}

interface TelegramRegistrationLinkResponse {
  phoneNumber: string;
  botUrl: string;
}

export interface RequestOtpResponse {
  sent: boolean;
  requiresRegistration: boolean;
  debugCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'expenses_tracker_access_token';
  private readonly refreshTokenKey = 'expenses_tracker_refresh_token';
  readonly user = signal<VerifyOtpResponse['user'] | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly i18n: I18nService
  ) {}

  get accessToken() {
    return localStorage.getItem(this.tokenKey);
  }

  get refreshTokenValue() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  requestOtpWithTelegram(phoneNumber: string, telegramChatId?: string) {
    return this.http.post<RequestOtpResponse>(`${environment.apiBaseUrl}/auth/otp/request`, { phoneNumber, telegramChatId });
  }

  createTelegramRegistrationLink(phoneNumber: string) {
    return this.http.post<TelegramRegistrationLinkResponse>(`${environment.apiBaseUrl}/auth/telegram/registration-link`, { phoneNumber });
  }

  consumeTelegramLinkToken(token: string) {
    return this.http.post<TelegramLinkSessionResponse | TelegramLinkRegistrationResponse>(`${environment.apiBaseUrl}/auth/telegram/consume-link-token`, { token }).pipe(
      tap((response) => {
        if (response.linkedUser) {
          this.storeSession(response);
        }
      })
    );
  }

  verifyOtp(payload: {
    phoneNumber: string;
    code: string;
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    email?: string;
    countryOfResidence?: string;
    preferredCurrency?: string;
    preferredLanguage?: 'es' | 'en';
    telegramChatId?: string;
  }) {
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
    this.i18n.applyUserPreference(response.user.preferredLanguage);
  }
}
