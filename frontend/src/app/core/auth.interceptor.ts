import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken;
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      const canRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        Boolean(auth.refreshTokenValue) &&
        !request.url.includes('/auth/refresh') &&
        !request.url.includes('/auth/otp/');

      if (canRefresh) {
        return auth.refreshSession().pipe(
          switchMap((session) => next(request.clone({
            setHeaders: { Authorization: `Bearer ${session.accessToken}` }
          }))),
          catchError((refreshError: unknown) => {
            auth.logout();
            router.navigateByUrl('/login');
            return throwError(() => refreshError);
          })
        );
      }

      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
        router.navigateByUrl('/login');
      }

      return throwError(() => error);
    })
  );
};
