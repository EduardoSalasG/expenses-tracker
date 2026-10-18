import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { I18nService } from './i18n.service';
import { Observable } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: I18nService, useValue: { applyUserPreference: () => {}, language: () => 'es', setLanguage: () => {}, t: (key: string) => key } }
      ]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('stores access and refresh tokens after OTP verification', () => {
    service.verifyOtp({ phoneNumber: '+56982439041', code: '123456' }).subscribe();

    const request = http.expectOne(`${environment.apiBaseUrl}/auth/otp/verify`);
    request.flush({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        firstName: 'Test',
        lastName: 'User',
        preferredName: 'Test',
        phoneNumber: '+56982439041',
        preferredCurrency: 'CLP'
      }
    });

    expect(service.accessToken).toBe('access-token');
    expect(service.refreshTokenValue).toBe('refresh-token');
    expect(service.user()?.preferredCurrency).toBe('CLP');
  });

  it('clears stored session on logout', () => {
    localStorage.setItem('expenses_tracker_access_token', 'access-token');
    localStorage.setItem('expenses_tracker_refresh_token', 'refresh-token');

    service.logout();

    expect(service.accessToken).toBeNull();
    expect(service.refreshTokenValue).toBeNull();
    expect(service.user()).toBeNull();
  });

  it('restores a persisted session before navigation can render', () => {
    localStorage.setItem('expenses_tracker_refresh_token', 'refresh-token');
    const bootstrap = service as unknown as {
      bootstrapSession?: () => Observable<void>;
      bootstrapReady?: () => boolean;
    };

    expect(bootstrap.bootstrapSession).withContext('session bootstrap must exist before the router is exposed').toEqual(jasmine.any(Function));
    bootstrap.bootstrapSession?.().subscribe();

    const request = http.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    request.flush({
      accessToken: 'renewed-access-token',
      refreshToken: 'renewed-refresh-token',
      user: {
        firstName: 'Test',
        lastName: 'User',
        preferredName: 'Test',
        phoneNumber: '+56982439041',
        preferredCurrency: 'CLP'
      }
    });

    expect(service.accessToken).toBe('renewed-access-token');
    expect(bootstrap.bootstrapReady?.()).toBeTrue();
  });

  it('clears an invalid persisted session before navigation can render', () => {
    localStorage.setItem('expenses_tracker_access_token', 'expired-access-token');
    localStorage.setItem('expenses_tracker_refresh_token', 'expired-refresh-token');
    const bootstrap = service as unknown as {
      bootstrapSession?: () => Observable<void>;
      bootstrapReady?: () => boolean;
    };

    expect(bootstrap.bootstrapSession).withContext('session bootstrap must exist before the router is exposed').toEqual(jasmine.any(Function));
    bootstrap.bootstrapSession?.().subscribe();

    const request = http.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    request.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.accessToken).toBeNull();
    expect(service.refreshTokenValue).toBeNull();
    expect(bootstrap.bootstrapReady?.()).toBeTrue();
  });

  it('finishes bootstrap without a network request when there is no persisted session', () => {
    const bootstrap = service as unknown as {
      bootstrapSession?: () => Observable<void>;
      bootstrapReady?: () => boolean;
    };

    expect(bootstrap.bootstrapSession).withContext('public navigation must wait for bootstrap completion').toEqual(jasmine.any(Function));
    bootstrap.bootstrapSession?.().subscribe();

    http.expectNone(`${environment.apiBaseUrl}/auth/refresh`);
    expect(bootstrap.bootstrapReady?.()).toBeTrue();
  });
});
