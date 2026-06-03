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
        <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <a routerLink="/" class="flex items-center gap-3 self-start" aria-label="Expenses Tracker home">
            <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy text-sm font-semibold text-white shadow-sm">ET</div>
            <div>
              <div class="text-lg font-semibold tracking-tight">{{ t('app_name') }}</div>
              <div class="text-xs text-brand-muted">{{ t('landing_tagline') }}</div>
            </div>
          </a>
          <nav aria-label="Primary" class="landing-primary-nav flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            <a
              mat-stroked-button
              routerLink="/login"
              class="landing-nav-login flex-1 sm:flex-none"
            >
              {{ t('landing_login') }}
            </a>
            <a
              mat-flat-button
              color="primary"
              routerLink="/login"
              [queryParams]="{ mode: 'register' }"
              class="landing-nav-register flex-1 sm:flex-none"
            >
              {{ t('landing_register') }}
            </a>
          </nav>
        </div>
      </header>

      <section class="relative overflow-hidden border-b border-brand-border/60 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_42%),linear-gradient(180deg,rgba(var(--brand-surface-rgb),1),rgba(var(--brand-bg-rgb),1))]">
        <div class="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-20">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue">{{ t('landing_eyebrow') }}</p>
            <h1 class="mt-4 text-3xl font-semibold tracking-tight text-brand-ink sm:text-5xl lg:text-6xl">
              {{ t('landing_title') }}
            </h1>
            <p class="mt-5 max-w-xl text-base leading-7 text-brand-muted sm:text-lg">
              {{ t('landing_description') }}
            </p>
            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              @for (outcome of outcomes; track outcome.label) {
                <div class="rounded-lg border border-brand-border bg-brand-surface/85 p-4 shadow-sm">
                  <p class="text-xl font-semibold text-brand-ink">{{ outcome.value }}</p>
                  <p class="mt-1 text-sm text-brand-muted">{{ outcome.label }}</p>
                </div>
              }
            </div>
            <div class="landing-cta-group mt-8 flex flex-col gap-3 sm:flex-row">
              <a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="!h-12 !px-6">
                {{ t('landing_register') }}
              </a>
            </div>
            <p class="mt-3 text-sm text-brand-muted">{{ t('landing_cta_support') }}</p>
            <ul class="mt-8 grid gap-3 text-sm text-brand-muted sm:grid-cols-3">
              <li class="flex items-center gap-2">
                <mat-icon class="landing-inline-icon !h-5 !w-5 !text-brand-blue">chat</mat-icon>
                <span>{{ t('landing_proof_messaging') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <mat-icon class="landing-inline-icon !h-5 !w-5 !text-brand-blue">savings</mat-icon>
                <span>{{ t('landing_proof_budget') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <mat-icon class="landing-inline-icon !h-5 !w-5 !text-brand-blue">monitoring</mat-icon>
                <span>{{ t('landing_proof_reports') }}</span>
              </li>
            </ul>
          </div>

          <div class="relative mx-auto w-full max-w-[320px] sm:max-w-[420px] lg:max-w-[520px]">
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
        <div class="grid gap-4 md:grid-cols-3">
          @for (reason of reasons; track reason.title) {
            <article class="rounded-lg border border-brand-border bg-brand-surface p-5 shadow-sm">
              <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface-muted text-brand-blue">
                <mat-icon class="landing-inline-icon">{{ reason.icon }}</mat-icon>
              </div>
              <h2 class="mt-4 text-lg font-semibold">{{ reason.title }}</h2>
              <p class="mt-2 text-sm leading-6 text-brand-muted">{{ reason.description }}</p>
            </article>
          }
        </div>

        <div class="max-w-2xl">
          <h2 class="mt-14 text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_features_title') }}</h2>
          <p class="mt-3 text-base leading-7 text-brand-muted">
            {{ t('landing_features_subtitle') }}
          </p>
        </div>
        <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (feature of features; track feature.title) {
            <article class="rounded-lg border border-brand-border bg-brand-surface p-5 shadow-sm">
              <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface-muted text-brand-blue">
                <mat-icon class="landing-inline-icon">{{ feature.icon }}</mat-icon>
              </div>
              <h3 class="mt-4 text-lg font-semibold">{{ feature.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-brand-muted">{{ feature.description }}</p>
            </article>
          }
        </div>
      </section>

      <section class="border-y border-brand-border/60 bg-brand-surface">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div class="max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_preview_title') }}</h2>
            <p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_preview_subtitle') }}</p>
          </div>
          <div class="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <article class="overflow-hidden rounded-2xl border border-brand-border bg-brand-bg shadow-sm">
              <div class="flex items-center justify-between border-b border-brand-border px-4 py-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">{{ t('landing_preview_web_label') }}</p>
                  <h3 class="mt-1 text-lg font-semibold text-brand-ink">{{ t('landing_preview_web_title') }}</h3>
                </div>
                <div class="rounded-lg bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-ink shadow-sm">{{ t('landing_preview_web_badge') }}</div>
              </div>
              <div class="grid gap-4 p-4 sm:grid-cols-3">
                @for (metric of previewMetrics; track metric.label) {
                  <div class="rounded-xl border border-brand-border bg-brand-surface p-4">
                    <p class="text-sm text-brand-muted">{{ metric.label }}</p>
                    <p class="mt-2 text-2xl font-semibold text-brand-ink">{{ metric.value }}</p>
                    <p class="mt-1 text-xs text-brand-muted">{{ metric.caption }}</p>
                  </div>
                }
              </div>
              <div class="grid gap-4 border-t border-brand-border p-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div class="rounded-xl border border-brand-border bg-brand-surface p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-brand-blue">{{ t('landing_preview_variation_title') }}</h4>
                  <ul class="mt-4 space-y-3">
                    @for (variation of previewVariations; track variation.category) {
                      <li class="flex items-center justify-between gap-4">
                        <div>
                          <p class="font-medium text-brand-ink">{{ variation.category }}</p>
                          <p class="text-sm text-brand-muted">{{ variation.detail }}</p>
                        </div>
                        <span class="text-sm font-semibold" [class.text-emerald-500]="variation.positive" [class.text-rose-400]="!variation.positive">
                          {{ variation.delta }}
                        </span>
                      </li>
                    }
                  </ul>
                </div>
                <div class="rounded-xl border border-brand-border bg-brand-surface p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-brand-blue">{{ t('landing_preview_history_title') }}</h4>
                  <div class="mt-4 space-y-3">
                    @for (record of previewHistory; track record.concept) {
                      <div class="flex items-start justify-between gap-4 rounded-lg bg-brand-surface-muted px-3 py-3">
                        <div class="min-w-0">
                          <p class="truncate font-medium text-brand-ink">{{ record.concept }}</p>
                          <p class="text-sm text-brand-muted">{{ record.meta }}</p>
                        </div>
                        <span class="shrink-0 text-sm font-semibold text-brand-ink">{{ record.amount }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </article>

            <article class="overflow-hidden rounded-2xl border border-brand-border bg-brand-bg shadow-sm">
              <div class="flex items-center justify-between border-b border-brand-border px-4 py-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">{{ t('landing_preview_telegram_label') }}</p>
                  <h3 class="mt-1 text-lg font-semibold text-brand-ink">{{ t('landing_preview_telegram_title') }}</h3>
                </div>
                <div class="rounded-lg bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-ink shadow-sm">{{ t('landing_preview_telegram_badge') }}</div>
              </div>
              <div class="space-y-3 p-4">
                @for (message of previewTelegram; track message.body) {
                  <div class="flex" [class.justify-end]="message.outbound">
                    <div class="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm" [class.bg-brand-blue]="message.outbound" [class.text-white]="message.outbound" [class.bg-brand-surface]="!message.outbound" [class.text-brand-ink]="!message.outbound" [class.border]="!message.outbound" [class.border-brand-border]="!message.outbound">
                      <p>{{ message.body }}</p>
                    </div>
                  </div>
                }
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="border-y border-brand-border/60 bg-brand-surface-muted/55">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div class="max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_examples_title') }}</h2>
            <p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_examples_subtitle') }}</p>
          </div>
          <div class="mt-8 grid gap-4 lg:grid-cols-3">
            @for (example of examples; track example.title) {
              <article class="rounded-lg border border-brand-border bg-brand-surface p-5 shadow-sm">
                <p class="text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">{{ example.title }}</p>
                <p class="mt-4 break-words rounded-lg bg-brand-surface-muted px-4 py-3 text-sm font-medium leading-6 text-brand-ink">
                  {{ example.input }}
                </p>
                <p class="mt-4 text-sm leading-6 text-brand-muted">{{ example.output }}</p>
              </article>
            }
          </div>
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
        <div class="max-w-2xl">
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_trust_title') }}</h2>
          <p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_trust_subtitle') }}</p>
        </div>
        <div class="mt-8 grid gap-4 md:grid-cols-3">
          @for (trust of trustPoints; track trust.title) {
            <article class="rounded-lg border border-brand-border bg-brand-surface p-5 shadow-sm">
              <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface-muted text-brand-blue">
                <mat-icon class="landing-inline-icon">{{ trust.icon }}</mat-icon>
              </div>
              <h3 class="mt-4 text-lg font-semibold">{{ trust.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-brand-muted">{{ trust.description }}</p>
            </article>
          }
        </div>
      </section>

      <section class="border-y border-brand-border/60 bg-brand-surface-muted/55">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div class="max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_faq_title') }}</h2>
            <p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_faq_subtitle') }}</p>
          </div>
          <div class="mt-8 grid gap-4 lg:grid-cols-2">
            @for (item of faq; track item.question) {
              <article class="rounded-xl border border-brand-border bg-brand-surface p-5 shadow-sm">
                <h3 class="text-lg font-semibold text-brand-ink">{{ item.question }}</h3>
                <p class="mt-2 text-sm leading-6 text-brand-muted">{{ item.answer }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div class="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div class="max-w-2xl">
            <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_cta_title') }}</h2>
            <p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_cta_description') }}</p>
          </div>
          <div class="mt-6 grid w-full gap-3 lg:mt-0 lg:max-w-xl lg:grid-cols-2">
            @for (cta of contextualCtas; track cta.title) {
              <article class="rounded-xl border border-brand-border bg-brand-bg p-4">
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
                    <mat-icon class="landing-inline-icon">{{ cta.icon }}</mat-icon>
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-base font-semibold text-brand-ink">{{ cta.title }}</h3>
                    <p class="mt-1 text-sm leading-6 text-brand-muted">{{ cta.description }}</p>
                  </div>
                </div>
                <a mat-flat-button [color]="cta.primary ? 'primary' : undefined" routerLink="/login" [queryParams]="cta.queryParams" class="mt-4 !h-11 !w-full !px-5" [class.!bg-brand-surface]="!cta.primary" [class.!text-brand-ink]="!cta.primary">
                  {{ cta.button }}
                </a>
              </article>
            }
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

  readonly outcomes = [
    { value: this.t('landing_outcome_1_value'), label: this.t('landing_outcome_1_label') },
    { value: this.t('landing_outcome_2_value'), label: this.t('landing_outcome_2_label') },
    { value: this.t('landing_outcome_3_value'), label: this.t('landing_outcome_3_label') }
  ];

  readonly reasons = [
    { icon: 'bolt', title: this.t('landing_reason_1_title'), description: this.t('landing_reason_1_desc') },
    { icon: 'visibility', title: this.t('landing_reason_2_title'), description: this.t('landing_reason_2_desc') },
    { icon: 'psychology', title: this.t('landing_reason_3_title'), description: this.t('landing_reason_3_desc') }
  ];

  readonly steps = [
    { title: this.t('landing_step_1_title'), description: this.t('landing_step_1_desc') },
    { title: this.t('landing_step_2_title'), description: this.t('landing_step_2_desc') },
    { title: this.t('landing_step_3_title'), description: this.t('landing_step_3_desc') }
  ];

  readonly examples = [
    { title: this.t('landing_example_1_title'), input: this.t('landing_example_1_input'), output: this.t('landing_example_1_output') },
    { title: this.t('landing_example_2_title'), input: this.t('landing_example_2_input'), output: this.t('landing_example_2_output') },
    { title: this.t('landing_example_3_title'), input: this.t('landing_example_3_input'), output: this.t('landing_example_3_output') }
  ];

  readonly trustPoints = [
    { icon: 'shield', title: this.t('landing_trust_1_title'), description: this.t('landing_trust_1_desc') },
    { icon: 'devices', title: this.t('landing_trust_2_title'), description: this.t('landing_trust_2_desc') },
    { icon: 'insights', title: this.t('landing_trust_3_title'), description: this.t('landing_trust_3_desc') }
  ];

  readonly previewMetrics = [
    { label: this.t('landing_preview_metric_1_label'), value: this.t('landing_preview_metric_1_value'), caption: this.t('landing_preview_metric_1_caption') },
    { label: this.t('landing_preview_metric_2_label'), value: this.t('landing_preview_metric_2_value'), caption: this.t('landing_preview_metric_2_caption') },
    { label: this.t('landing_preview_metric_3_label'), value: this.t('landing_preview_metric_3_value'), caption: this.t('landing_preview_metric_3_caption') }
  ];

  readonly previewVariations = [
    { category: this.t('landing_preview_variation_1_category'), detail: this.t('landing_preview_variation_1_detail'), delta: this.t('landing_preview_variation_1_delta'), positive: false },
    { category: this.t('landing_preview_variation_2_category'), detail: this.t('landing_preview_variation_2_detail'), delta: this.t('landing_preview_variation_2_delta'), positive: true },
    { category: this.t('landing_preview_variation_3_category'), detail: this.t('landing_preview_variation_3_detail'), delta: this.t('landing_preview_variation_3_delta'), positive: false }
  ];

  readonly previewHistory = [
    { concept: this.t('landing_preview_history_1_concept'), meta: this.t('landing_preview_history_1_meta'), amount: this.t('landing_preview_history_1_amount') },
    { concept: this.t('landing_preview_history_2_concept'), meta: this.t('landing_preview_history_2_meta'), amount: this.t('landing_preview_history_2_amount') },
    { concept: this.t('landing_preview_history_3_concept'), meta: this.t('landing_preview_history_3_meta'), amount: this.t('landing_preview_history_3_amount') }
  ];

  readonly previewTelegram = [
    { body: this.t('landing_preview_message_1'), outbound: true },
    { body: this.t('landing_preview_message_2'), outbound: false },
    { body: this.t('landing_preview_message_3'), outbound: true },
    { body: this.t('landing_preview_message_4'), outbound: false }
  ];

  readonly faq = [
    { question: this.t('landing_faq_1_q'), answer: this.t('landing_faq_1_a') },
    { question: this.t('landing_faq_2_q'), answer: this.t('landing_faq_2_a') },
    { question: this.t('landing_faq_3_q'), answer: this.t('landing_faq_3_a') },
    { question: this.t('landing_faq_4_q'), answer: this.t('landing_faq_4_a') }
  ];

  readonly contextualCtas = [
    {
      icon: 'send',
      title: this.t('landing_cta_context_telegram_title'),
      description: this.t('landing_cta_context_telegram_desc'),
      button: this.t('landing_cta_context_telegram_button'),
      queryParams: { mode: 'register', channel: 'telegram' },
      primary: true
    },
    {
      icon: 'language',
      title: this.t('landing_cta_context_web_title'),
      description: this.t('landing_cta_context_web_desc'),
      button: this.t('landing_cta_context_web_button'),
      queryParams: { mode: 'register', channel: 'web' },
      primary: false
    }
  ];

  ngOnInit() {
    this.i18n.usePublicSpanish();
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
