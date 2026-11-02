import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';
import { PwaEngagementService } from './core/pwa-engagement.service';

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
      @if (showInstallBanner()) {
        <aside class="pwa-banner" role="region" [attr.aria-label]="t('pwa_install_title')">
          <strong>{{ t('pwa_install_title') }}</strong>
          <span>{{ t('pwa_install_description') }}</span>
          <button type="button" (click)="installApp()">{{ t('pwa_install_action') }}</button>
          <button type="button" (click)="dismissInstall()">{{ t('pwa_later_action') }}</button>
        </aside>
      }
      @if (showNotificationBanner()) {
        <aside class="pwa-banner" role="region" [attr.aria-label]="t('pwa_notifications_title')">
          <strong>{{ t('pwa_notifications_title') }}</strong>
          <span>{{ t('pwa_notifications_description') }}</span>
          <button type="button" (click)="activateNotifications()">{{ t('pwa_notifications_action') }}</button>
          <button type="button" (click)="dismissNotifications()">{{ t('pwa_later_action') }}</button>
        </aside>
      }
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

    .pwa-banner { position: fixed; z-index: 20; right: 1rem; bottom: 1rem; display: grid; max-width: min(26rem, calc(100vw - 2rem)); gap: .5rem; padding: 1rem; border: 1px solid var(--brand-border); border-radius: 1rem; color: var(--brand-ink); background: var(--brand-surface); box-shadow: 0 12px 28px rgb(15 23 42 / .18); }
    .pwa-banner button { min-height: 44px; padding: .5rem .8rem; border: 0; border-radius: .5rem; color: white; background: var(--brand-blue); font: inherit; font-weight: 600; }
    .pwa-banner button + button { color: var(--brand-ink); background: var(--brand-border); }
  `]
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly pwa = inject(PwaEngagementService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly bootstrapVisible = signal(true);
  readonly showInstallBanner = signal(false);
  readonly showNotificationBanner = signal(false);
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
        setTimeout(() => this.updatePwaBanners(), remainingDelay);
      }
    });
  }

  async installApp() {
    await this.pwa.install();
    this.showInstallBanner.set(false);
    this.updatePwaBanners();
  }

  dismissInstall() { localStorage.setItem('pwa-install-dismissed', 'true'); this.showInstallBanner.set(false); }
  dismissNotifications() { localStorage.setItem('pwa-notifications-dismissed', 'true'); this.showNotificationBanner.set(false); }

  async activateNotifications() {
    await this.pwa.activateNotifications();
    this.showNotificationBanner.set(false);
  }

  private updatePwaBanners() {
    if (!this.isBrowser) return;
    this.showInstallBanner.set(this.pwa.installAvailable() && localStorage.getItem('pwa-install-dismissed') !== 'true');
    this.showNotificationBanner.set(this.pwa.isStandalone() && localStorage.getItem('pwa-notifications-dismissed') !== 'true' && Notification.permission === 'default');
  }
}
