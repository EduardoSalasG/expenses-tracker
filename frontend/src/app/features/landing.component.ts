import { Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-brand-bg text-brand-ink">
      <header class="border-b border-brand-border/80 bg-brand-surface/90 backdrop-blur">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a routerLink="/" class="flex items-center gap-3" aria-label="Expenses Tracker home">
            <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy text-sm font-semibold text-white shadow-sm">ET</div>
            <div>
              <div class="text-lg font-semibold tracking-tight">{{ t('app_name') }}</div>
              <div class="text-xs text-brand-muted">{{ t('landing_tagline') }}</div>
            </div>
          </a>
          <nav aria-label="Primary" class="flex items-center gap-2 sm:gap-3">
            <a mat-button routerLink="/login" class="!text-brand-navy">{{ t('landing_login') }}</a>
            <a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }">{{ t('landing_register') }}</a>
          </nav>
        </div>
      </header>

      <section class="relative overflow-hidden border-b border-brand-border/60 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_42%),linear-gradient(180deg,rgba(var(--brand-surface-rgb),1),rgba(var(--brand-bg-rgb),1))]">
        <div class="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-20">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue">{{ t('landing_eyebrow') }}</p>
            <h1 class="mt-4 text-4xl font-semibold tracking-tight text-brand-ink sm:text-5xl lg:text-6xl">
              {{ t('landing_title') }}
            </h1>
            <p class="mt-5 max-w-xl text-base leading-7 text-brand-muted sm:text-lg">
              {{ t('landing_description') }}
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="!h-12 !px-6">
                {{ t('landing_register') }}
              </a>
              <a mat-stroked-button routerLink="/login" class="!h-12 !px-6 !border-brand-border !text-brand-ink">
                {{ t('landing_login') }}
              </a>
            </div>
            <ul class="mt-8 grid gap-3 text-sm text-brand-muted sm:grid-cols-3">
              <li class="flex items-center gap-2">
                <mat-icon class="!h-5 !w-5 !text-brand-blue">chat</mat-icon>
                <span>{{ t('landing_proof_messaging') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <mat-icon class="!h-5 !w-5 !text-brand-blue">savings</mat-icon>
                <span>{{ t('landing_proof_budget') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <mat-icon class="!h-5 !w-5 !text-brand-blue">monitoring</mat-icon>
                <span>{{ t('landing_proof_reports') }}</span>
              </li>
            </ul>
          </div>

          <div class="relative mx-auto w-full max-w-[520px]">
            <div class="landing-hero-art">
              <div class="landing-hero-ring"></div>
              <div class="landing-hero-card">
                <div class="landing-hero-bot">
                  <div class="landing-hero-antenna"></div>
                  <div class="landing-hero-head">
                    <div class="landing-hero-face">
                      <span class="landing-hero-eye"></span>
                      <span class="landing-hero-eye"></span>
                      <span class="landing-hero-smile"></span>
                    </div>
                  </div>
                  <div class="landing-hero-body">
                    <div class="landing-hero-logo">ET</div>
                  </div>
                </div>
                <div class="landing-hero-coin-stack"></div>
                <div class="landing-hero-coin"></div>
                <div class="landing-hero-receipt"></div>
                <div class="landing-hero-chart landing-hero-chart-left"></div>
                <div class="landing-hero-chart landing-hero-chart-right"></div>
                <div class="landing-hero-wallet"></div>
              </div>
            </div>
            <p class="mt-4 text-center text-sm text-brand-muted">{{ t('landing_visual_caption') }}</p>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_features_title') }}</h2>
          <p class="mt-3 text-base leading-7 text-brand-muted">
            {{ t('landing_features_subtitle') }}
          </p>
        </div>
        <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (feature of features; track feature.title) {
            <article class="rounded-lg border border-brand-border bg-brand-surface p-5 shadow-sm">
              <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface-muted text-brand-blue">
                <mat-icon>{{ feature.icon }}</mat-icon>
              </div>
              <h3 class="mt-4 text-lg font-semibold">{{ feature.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-brand-muted">{{ feature.description }}</p>
            </article>
          }
        </div>
      </section>

      <section class="border-y border-brand-border/60 bg-brand-surface">
        <div class="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_how_title') }}</h2>
            <p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_how_subtitle') }}</p>
          </div>
          <ol class="grid gap-4">
            @for (step of steps; track step.title; let index = $index) {
              <li class="rounded-lg border border-brand-border bg-brand-bg p-5">
                <div class="flex items-start gap-4">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">{{ index + 1 }}</div>
                  <div>
                    <h3 class="text-lg font-semibold">{{ step.title }}</h3>
                    <p class="mt-1 text-sm leading-6 text-brand-muted">{{ step.description }}</p>
                  </div>
                </div>
              </li>
            }
          </ol>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div class="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div class="max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_cta_title') }}</h2>
            <p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_cta_description') }}</p>
          </div>
          <div class="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="!h-12 !px-6">
              {{ t('landing_register') }}
            </a>
            <a mat-stroked-button routerLink="/login" class="!h-12 !px-6 !border-brand-border !text-brand-ink">
              {{ t('landing_login') }}
            </a>
          </div>
        </div>
      </section>
    </main>
  `
})
export class LandingComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);

  readonly features = [
    { icon: 'chat', title: this.t('landing_feature_chat_title'), description: this.t('landing_feature_chat_desc') },
    { icon: 'pie_chart', title: this.t('landing_feature_dashboard_title'), description: this.t('landing_feature_dashboard_desc') },
    { icon: 'account_balance_wallet', title: this.t('landing_feature_budget_title'), description: this.t('landing_feature_budget_desc') },
    { icon: 'schedule', title: this.t('landing_feature_reports_title'), description: this.t('landing_feature_reports_desc') }
  ];

  readonly steps = [
    { title: this.t('landing_step_1_title'), description: this.t('landing_step_1_desc') },
    { title: this.t('landing_step_2_title'), description: this.t('landing_step_2_desc') },
    { title: this.t('landing_step_3_title'), description: this.t('landing_step_3_desc') }
  ];

  ngOnInit() {
    const title = this.t('landing_meta_title');
    const description = this.t('landing_meta_description');
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }

  t(key: string) {
    return this.i18n.t(key);
  }
}
