import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { requestCorrelationInterceptor } from './request-correlation.interceptor';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('requestCorrelationInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([requestCorrelationInterceptor])),
        provideHttpClientTesting()
      ]
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adds a distinct request ID without replacing existing authentication or account headers', () => {
    const headers = new HttpHeaders({
      Authorization: 'Bearer access-token',
      'X-Financial-Account-Id': 'account-id'
    });

    httpClient.get('/api/first', { headers }).subscribe();
    const first = http.expectOne('/api/first');
    const firstRequestId = first.request.headers.get('X-Request-ID');
    first.flush({});

    httpClient.get('/api/second', { headers }).subscribe();
    const second = http.expectOne('/api/second');

    expect(firstRequestId).toMatch(uuidPattern);
    expect(second.request.headers.get('X-Request-ID')).toMatch(uuidPattern);
    expect(second.request.headers.get('X-Request-ID')).not.toBe(firstRequestId);
    expect(second.request.headers.get('Authorization')).toBe('Bearer access-token');
    expect(second.request.headers.get('X-Financial-Account-Id')).toBe('account-id');
    second.flush({});
  });
});
