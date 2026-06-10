import { Injectable, inject } from '@angular/core';
import { I18nService } from './i18n.service';

type Driver = {
  drive: () => void;
};

type DriverFactory = (config: {
  showProgress?: boolean;
  allowClose?: boolean;
  overlayClickBehavior?: 'close' | 'nextStep';
  disableActiveInteraction?: boolean;
  nextBtnText?: string;
  prevBtnText?: string;
  doneBtnText?: string;
  steps: Array<{
    element?: string;
    popover: {
      title: string;
      description: string;
      side?: 'top' | 'right' | 'bottom' | 'left';
      align?: 'start' | 'center' | 'end';
    };
  }>;
  onDestroyed?: () => void;
}) => Driver;

export interface OnboardingStep {
  element?: string;
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly i18n = inject(I18nService);
  private loading?: Promise<DriverFactory>;
  private running = false;

  async startOnce(flowKey: string, steps: OnboardingStep[]) {
    if (this.running) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(this.storageKey(flowKey)) === 'done') return;

    const validSteps = steps.filter((step) => !step.element || document.querySelector(step.element));
    if (!validSteps.length) {
      localStorage.setItem(this.storageKey(flowKey), 'done');
      return;
    }

    const driverFactory = await this.loadDriver();
    this.running = true;
    const driver = driverFactory({
      showProgress: true,
      allowClose: true,
      overlayClickBehavior: 'close',
      disableActiveInteraction: false,
      nextBtnText: this.i18n.t('onboarding_next'),
      prevBtnText: this.i18n.t('onboarding_previous'),
      doneBtnText: this.i18n.t('onboarding_done'),
      steps: validSteps.map((step) => ({
        element: step.element,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side ?? 'bottom',
          align: step.align ?? 'start'
        }
      })),
      onDestroyed: () => {
        localStorage.setItem(this.storageKey(flowKey), 'done');
        this.running = false;
      }
    });
    driver.drive();
  }

  reset(flowKey: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey(flowKey));
  }

  private async loadDriver() {
    if (!this.loading) {
      this.loading = import('driver.js').then((module) => module.driver);
    }
    return this.loading;
  }

  private storageKey(flowKey: string) {
    return `expenses-tracker:onboarding:${flowKey}`;
  }
}
