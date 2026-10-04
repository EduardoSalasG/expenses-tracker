import { HttpInterceptorFn } from '@angular/common/http';

export const requestCorrelationInterceptor: HttpInterceptorFn = (request, next) => next(request.clone({
  setHeaders: { 'X-Request-ID': crypto.randomUUID() }
}));
