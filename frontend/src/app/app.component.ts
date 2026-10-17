import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (bootstrapVisible()) {
      <main class="app-bootstrap-loader" data-testid="app-bootstrap-loader" role="status" aria-live="polite" aria-busy="true">
        <span class="app-bootstrap-loader__mark" aria-hidden="true"></span>
        <span>{{ t('app_bootstrap_loading') }}</span>
      </main>
    } @else {
      <router-outlet></router-outlet>
    }
  `,
  styles: [`
    .app-bootstrap-loader {
      display: grid;
      min-height: 100dvh;
      place-content: center;
      justify-items: center;
      gap: 1rem;
      padding: 2rem;
      color: var(--brand-ink);
      background: var(--brand-surface);
      font: 500 1rem/1.5 inherit;
    }

    .app-bootstrap-loader__mark {
      width: 2.5rem;
      aspect-ratio: 1;
      border: 0.25rem solid var(--brand-border);
      border-top-color: var(--brand-blue);
      border-radius: 50%;
      animation: app-bootstrap-spin 0.8s linear infinite;
    }

    @keyframes app-bootstrap-spin { to { transform: rotate(1turn); } }

    @media (prefers-reduced-motion: reduce) {
      .app-bootstrap-loader__mark { animation: none; border-top-color: var(--brand-ink); }
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly bootstrapVisible = signal(true);
  readonly t = (key: string) => this.i18n.t(key);

  constructor(private readonly i18n: I18nService) {
    this.i18n.syncDocumentLanguage();
  }

  ngOnInit() {
    if (!this.isBrowser) {
      this.bootstrapVisible.set(false);
      return;
    }

    const startedAt = Date.now();
    this.auth.bootstrapSession().subscribe({
      complete: () => {
        const remainingDelay = Math.max(0, 2000 - (Date.now() - startedAt));
        setTimeout(() => this.bootstrapVisible.set(false), remainingDelay);
      }
    });
  }
}
