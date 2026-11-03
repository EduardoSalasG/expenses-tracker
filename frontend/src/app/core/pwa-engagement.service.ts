import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaEngagementService {
  private readonly installPrompt = signal<InstallPromptEvent | undefined>(undefined);
  readonly installAvailable = signal(false);

  constructor(private readonly api: ApiService) {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.installPrompt.set(event as InstallPromptEvent);
        this.installAvailable.set(true);
      });
    }
  }

  async install(): Promise<boolean> {
    const prompt = this.installPrompt();
    if (!prompt) return false;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    this.installPrompt.set(undefined);
    this.installAvailable.set(false);
    return choice.outcome === 'accepted';
  }

  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  manualInstallAvailable(): boolean {
    if (typeof window === 'undefined' || this.isStandalone()) return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  async activateNotifications(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted' || !('serviceWorker' in navigator) || !('PushManager' in window)) return permission;

    const { publicKey } = await firstValueFrom(this.api.pushPublicKey());
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return permission;
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) });
    const json = subscription.toJSON();
    const p256dh = json.keys?.['p256dh'];
    const auth = json.keys?.['auth'];
    if (!json.endpoint || !p256dh || !auth) throw new Error('The browser did not return a valid Push subscription.');
    await firstValueFrom(this.api.registerPushSubscription({ endpoint: json.endpoint, keys: { p256dh, auth } }));
    return permission;
  }

  async deactivateNotifications(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await firstValueFrom(this.api.unregisterPushSubscription(subscription.endpoint));
    await subscription.unsubscribe();
  }
}

function toUint8Array(base64Url: string): Uint8Array {
  const normalized = `${base64Url}${'='.repeat((4 - base64Url.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(normalized);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}
