import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.accessToken) return true;
  const url = new URL(state.url, 'http://localhost');
  const invitationToken = url.searchParams.get('accountInvitationToken');
  return router.createUrlTree(['/login'], {
    queryParams: invitationToken ? { accountInvitationToken: invitationToken } : undefined
  });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.accessToken) return true;
  return router.createUrlTree(['/dashboard']);
};
