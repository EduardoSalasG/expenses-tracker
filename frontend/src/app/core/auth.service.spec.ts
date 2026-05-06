import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
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
        name: 'Test User',
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
});
