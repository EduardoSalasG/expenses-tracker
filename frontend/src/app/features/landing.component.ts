import { Component, OnInit, computed, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../core/i18n.service';
import { PublicContextService } from '../core/public-context.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-brand-bg text-brand-ink">
      <header class="border-b border-brand-border/80 bg-brand-surface/95 backdrop-blur">
        <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <a routerLink="/" class="flex items-center gap-3" aria-label="Expenses Tracker home">
            <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-blue text-sm font-bold text-white shadow-sm">ET</span>
            <span>
              <span class="block text-lg font-semibold tracking-tight">{{ t('app_name') }}</span>
              <span class="block text-xs text-brand-muted">{{ t('landing_tagline') }}</span>
            </span>
          </a>
          <nav aria-label="Primary" class="flex w-full items-center gap-2 sm:w-auto">
            <div class="inline-flex shrink-0 rounded-lg border border-brand-border bg-brand-surface-muted p-1">
              @for (language of languages; track language.code) {
                <button type="button" class="rounded-md px-3 py-2 text-xs font-semibold transition-colors"
                  [class.bg-brand-blue]="i18n.language() === language.code"
                  [class.text-white]="i18n.language() === language.code"
                  [class.text-brand-ink]="i18n.language() !== language.code"
                  (click)="changeLanguage(language.code)">{{ language.label }}</button>
              }
            </div>
            <a mat-stroked-button routerLink="/login" class="min-w-0 flex-1 sm:flex-none">{{ t('landing_login') }}</a>
            <a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="min-w-0 flex-1 sm:flex-none">{{ t('landing_register_short') }}</a>
          </nav>
        </div>
      </header>

      <section class="border-b border-brand-border/70 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_42%)]">
        <div class="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-[0.16em] text-brand-blue">{{ t('landing_eyebrow') }}</p>
            <h1 class="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{{ t('landing_title') }}</h1>
            <p class="mt-5 max-w-xl text-base leading-7 text-brand-muted sm:text-lg">{{ t('landing_description') }}</p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="!h-12 !px-6">{{ t('landing_register_short') }}</a>
              <a mat-stroked-button routerLink="/login" class="!h-12 !px-6">{{ t('landing_login') }}</a>
            </div>
            <p class="mt-3 text-sm text-brand-muted">{{ t('landing_cta_support') }}</p>
          </div>

          <div class="rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-xl shadow-brand-navy/10 sm:p-5" aria-label="Product preview">
            <div class="flex items-center justify-between border-b border-brand-border pb-4">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-white">ET</span>
                <div><p class="font-semibold">{{ t('app_name') }}</p><p class="text-xs text-brand-muted">{{ t('landing_preview_label') }}</p></div>
              </div>
              <span class="rounded-full bg-brand-surface-muted px-3 py-1 text-xs font-semibold text-brand-muted">{{ t('landing_preview_period') }}</span>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              @for (metric of previewMetrics(); track metric.label) {
                <div class="rounded-lg border border-brand-border bg-brand-surface-muted p-4"><p class="text-xs font-medium text-brand-muted">{{ metric.label }}</p><p class="mt-2 text-xl font-semibold">{{ metric.value }}</p></div>
              }
            </div>
            <div class="mt-4 rounded-lg border border-brand-border bg-brand-surface-muted p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-brand-blue">{{ t('landing_preview_history_title') }}</p>
              @for (record of previewHistory(); track record.concept) {
                <div class="flex items-center justify-between gap-3 border-b border-brand-border/70 py-3 last:border-0 last:pb-0">
                  <div class="min-w-0"><p class="truncate text-sm font-medium">{{ record.concept }}</p><p class="text-xs text-brand-muted">{{ record.meta }}</p></div>
                  <span class="shrink-0 text-sm font-semibold">{{ record.amount }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div class="max-w-2xl"><h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_features_title') }}</h2><p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_features_subtitle') }}</p></div>
        <div class="mt-8 grid gap-4 md:grid-cols-3">
          @for (feature of features(); track feature.title) {
            <article class="rounded-lg border border-brand-border bg-brand-surface p-5 shadow-sm"><mat-icon class="!h-6 !w-6 text-brand-blue">{{ feature.icon }}</mat-icon><h3 class="mt-4 text-lg font-semibold">{{ feature.title }}</h3><p class="mt-2 text-sm leading-6 text-brand-muted">{{ feature.description }}</p></article>
          }
        </div>
      </section>

      <section class="border-y border-brand-border/70 bg-brand-surface">
        <div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div><h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_how_title') }}</h2><p class="mt-3 text-base leading-7 text-brand-muted">{{ t('landing_how_subtitle') }}</p></div>
            <ol class="grid gap-3 sm:grid-cols-3">
              @for (step of steps(); track step.title; let index = $index) {
                <li class="rounded-lg border border-brand-border bg-brand-bg p-5"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">{{ index + 1 }}</span><h3 class="mt-4 font-semibold">{{ step.title }}</h3><p class="mt-1 text-sm leading-6 text-brand-muted">{{ step.description }}</p></li>
              }
            </ol>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div class="rounded-2xl border border-brand-border bg-brand-surface p-6 text-center shadow-sm sm:p-8"><h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('landing_cta_title') }}</h2><p class="mx-auto mt-3 max-w-xl text-base leading-7 text-brand-muted">{{ t('landing_cta_description') }}</p><a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="mt-6 !h-12 !px-6">{{ t('landing_register_short') }}</a></div></section>

      <footer class="border-t border-brand-border/70 bg-brand-surface"><div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-brand-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>{{ t('landing_footer_copy') }}</p><nav class="flex gap-4" aria-label="Legal"><a routerLink="/terms" class="hover:text-brand-ink hover:underline">{{ t('landing_footer_terms') }}</a><a routerLink="/privacy" class="hover:text-brand-ink hover:underline">{{ t('landing_footer_privacy') }}</a></nav></div></footer>
    </main>
  `
})
export class LandingComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly i18n = inject(I18nService);
  private readonly publicContext = inject(PublicContextService);
  readonly languages = [{ code: 'es' as const, label: 'ES' }, { code: 'en' as const, label: 'EN' }];
  readonly features = computed(() => [
    { icon: 'edit_note', title: this.t('landing_feature_chat_title'), description: this.t('landing_feature_chat_desc') },
    { icon: 'account_balance_wallet', title: this.t('landing_feature_shared_title'), description: this.t('landing_feature_shared_desc') },
    { icon: 'pie_chart', title: this.t('landing_feature_budget_title'), description: this.t('landing_feature_budget_desc') }
  ]);
  readonly steps = computed(() => [
    { title: this.t('landing_step_1_title'), description: this.t('landing_step_1_desc') },
    { title: this.t('landing_step_2_title'), description: this.t('landing_step_2_desc') },
    { title: this.t('landing_step_3_title'), description: this.t('landing_step_3_desc') }
  ]);
  readonly previewMetrics = computed(() => [
    { label: this.t('landing_preview_metric_1_label'), value: this.t('landing_preview_metric_1_value') },
    { label: this.t('landing_preview_metric_2_label'), value: this.t('landing_preview_metric_2_value') },
    { label: this.t('landing_preview_metric_3_label'), value: this.t('landing_preview_metric_3_value') }
  ]);
  readonly previewHistory = computed(() => [
    { concept: this.t('landing_preview_history_1_concept'), meta: this.t('landing_preview_history_1_meta'), amount: this.t('landing_preview_history_1_amount') },
    { concept: this.t('landing_preview_history_2_concept'), meta: this.t('landing_preview_history_2_meta'), amount: this.t('landing_preview_history_2_amount') },
    { concept: this.t('landing_preview_history_3_concept'), meta: this.t('landing_preview_history_3_meta'), amount: this.t('landing_preview_history_3_amount') }
  ]);

  ngOnInit() {
    if (!this.i18n.hasSavedLanguagePreference()) {
      this.i18n.usePublicDefault();
      this.publicContext.getContext().subscribe((context) => {
        if (!this.i18n.hasSavedLanguagePreference()) {
          this.i18n.usePublicLanguage(context.language);
          this.applyMetadata();
        }
      });
    }
    this.applyMetadata();
  }

  t(key: string) { return this.i18n.t(key); }
  changeLanguage(language: 'es' | 'en') { this.i18n.setLanguage(language); this.applyMetadata(); }

  private applyMetadata() {
    const title = this.t('landing_meta_title');
    const description = this.t('landing_meta_description');
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }
}
