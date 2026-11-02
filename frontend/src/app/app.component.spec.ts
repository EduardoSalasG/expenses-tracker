import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';
import { PwaEngagementService } from './core/pwa-engagement.service';

describe('AppComponent', () => {
  it('creates the root component', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: { syncDocumentLanguage: () => {}, t: (key: string) => key } },
        { provide: AuthService, useValue: { bootstrapReady: signal(false), user: signal(null), bootstrapSession: () => ({ subscribe: () => {} }) } },
        { provide: PwaEngagementService, useValue: { installAvailable: signal(false), isStandalone: () => false, install: () => Promise.resolve(false), activateNotifications: () => Promise.resolve('unsupported') } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the app bootstrap loader instead of routed content while session resolution is pending', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: { syncDocumentLanguage: () => {}, t: (key: string) => key } },
        { provide: AuthService, useValue: { bootstrapReady: signal(false), user: signal(null), bootstrapSession: () => ({ subscribe: () => {} }) } },
        { provide: PwaEngagementService, useValue: { installAvailable: signal(false), isStandalone: () => false, install: () => Promise.resolve(false), activateNotifications: () => Promise.resolve('unsupported') } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="app-bootstrap-loader"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });

  it('does not offer notification enrollment before the session identifies a user', async () => {
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default' } });
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: { syncDocumentLanguage: () => {}, t: (key: string) => key } },
        { provide: AuthService, useValue: { bootstrapReady: signal(false), user: signal(null), bootstrapSession: () => ({ subscribe: () => {} }) } },
        { provide: PwaEngagementService, useValue: { installAvailable: signal(false), isStandalone: () => true, install: () => Promise.resolve(false), activateNotifications: () => Promise.resolve('unsupported') } }
      ]
    }).compileComponents();

    const component = TestBed.createComponent(AppComponent).componentInstance;
    (component as unknown as { updatePwaBanners(): void }).updatePwaBanners();

    expect(component.showNotificationBanner()).toBeFalse();
  });

  it('synchronizes an already-granted Push subscription after authentication', async () => {
    const activateNotifications = jasmine.createSpy().and.resolveTo('granted');
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'granted' } });
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: { syncDocumentLanguage: () => {}, t: (key: string) => key } },
        { provide: AuthService, useValue: { bootstrapReady: signal(false), user: signal({ id: 'user-1' }), bootstrapSession: () => ({ subscribe: () => {} }) } },
        { provide: PwaEngagementService, useValue: { installAvailable: signal(false), isStandalone: () => true, install: () => Promise.resolve(false), activateNotifications } }
      ]
    }).compileComponents();

    const component = TestBed.createComponent(AppComponent).componentInstance;
    (component as unknown as { updatePwaBanners(): void }).updatePwaBanners();

    expect(activateNotifications).toHaveBeenCalledTimes(1);
  });
});
