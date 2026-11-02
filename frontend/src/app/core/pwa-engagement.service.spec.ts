import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { PwaEngagementService } from './pwa-engagement.service';

describe('PwaEngagementService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { pushPublicKey: () => of({ publicKey: '' }), registerPushSubscription: () => of(undefined) } }]
    });
  });

  it('exposes an install action after the browser raises beforeinstallprompt', () => {
    const service = TestBed.inject(PwaEngagementService);
    window.dispatchEvent(new Event('beforeinstallprompt'));
    expect(service.installAvailable()).toBeTrue();
  });

  it('does not request notification permission until the user activates it', async () => {
    const requestPermission = jasmine.createSpy().and.resolveTo('granted');
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default', requestPermission } });
    const service = TestBed.inject(PwaEngagementService);

    expect(requestPermission).not.toHaveBeenCalled();
    await service.activateNotifications();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});
