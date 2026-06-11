import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PublicContext {
  countryCode: string | null;
  language: 'es' | 'en';
}

@Injectable({ providedIn: 'root' })
export class PublicContextService {
  private context$?: Observable<PublicContext>;

  constructor(private readonly http: HttpClient) {}

  getContext() {
    this.context$ ??= this.http.get<PublicContext>(`${environment.apiBaseUrl}/public/context`).pipe(
      catchError(() => of({ countryCode: null, language: 'es' as const })),
      shareReplay(1)
    );

    return this.context$;
  }
}
