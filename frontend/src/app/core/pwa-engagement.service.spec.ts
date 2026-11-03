import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { PwaEngagementService } from './pwa-engagement.service';

describe('PwaEngagementService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { pushPublicKey: () => of({ publicKey: '' }), registerPushSubscription: () => of(undefined), unregisterPushSubscription: () => of(undefined) } }]
    });
  });

  it('exposes an install action after the browser raises beforeinstallprompt', () => {
    const service = TestBed.inject(PwaEngagementService);
    window.dispatchEvent(new Event('beforeinstallprompt'));
    expect(service.installAvailable()).toBeTrue();
  });

  it('recognizes an iOS app opened from the home screen', () => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    const service = TestBed.inject(PwaEngagementService);

    expect(service.isStandalone()).toBeTrue();
  });

  it('offers manual installation guidance on iOS when no native prompt exists', () => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    const service = TestBed.inject(PwaEngagementService);

    expect(service.manualInstallAvailable()).toBeTrue();
  });

  it('does not request notification permission until the user activates it', async () => {
    const requestPermission = jasmine.createSpy().and.resolveTo('granted');
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default', requestPermission } });
    const service = TestBed.inject(PwaEngagementService);

    expect(requestPermission).not.toHaveBeenCalled();
    await service.activateNotifications();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('keeps the user in control when notification permission was denied', async () => {
    const requestPermission = jasmine.createSpy();
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'denied', requestPermission } });
    const service = TestBed.inject(PwaEngagementService);

    await expectAsync(service.activateNotifications()).toBeResolvedTo('denied');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('registers the existing subscription after notification permission was already granted', async () => {
    const subscription = {
      endpoint: 'https://push.example.test/subscription',
      toJSON: () => ({ endpoint: 'https://push.example.test/subscription', keys: { p256dh: 'p256dh-key', auth: 'auth-key' } })
    };
    const registerPushSubscription = jasmine.createSpy().and.returnValue(of(undefined));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { pushPublicKey: () => of({ publicKey: 'AQ' }), registerPushSubscription, unregisterPushSubscription: () => of(undefined) } }]
    });
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'granted' } });
    Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }) } });
    const service = TestBed.inject(PwaEngagementService);

    await expectAsync(service.activateNotifications()).toBeResolvedTo('granted');

    expect(registerPushSubscription).toHaveBeenCalledWith({ endpoint: 'https://push.example.test/subscription', keys: { p256dh: 'p256dh-key', auth: 'auth-key' } });
  });

  it('reports browsers without notification support without failing the app', async () => {
    delete (window as unknown as { Notification?: unknown }).Notification;
    const service = TestBed.inject(PwaEngagementService);

    await expectAsync(service.activateNotifications()).toBeResolvedTo('unsupported');
  });
});
