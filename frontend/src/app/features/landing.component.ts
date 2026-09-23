import { Component, OnInit, computed, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../core/i18n.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  styles: [`
    :host { display: block; }
    .landing-hero { background: radial-gradient(circle at 80% 12%, rgb(var(--brand-blue-rgb) / .13), transparent 30rem); }
    .landing-preview { box-shadow: 0 24px 60px rgb(var(--brand-black-rgb) / .09); }
    .landing-language button:focus-visible, .landing-link:focus-visible { outline: 3px solid rgb(var(--brand-blue-rgb) / .58); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }
  `],
  template: `
    <a href="#main-content" class="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-lg focus:bg-brand-surface focus:px-4 focus:py-3 focus:text-brand-ink focus:shadow-lg">{{ t('landing_skip_to_content') }}</a>
    <header class="border-b border-brand-border/80 bg-brand-surface/95">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <a routerLink="/" class="landing-link flex min-w-0 items-center gap-3 rounded-lg" [attr.aria-label]="brandLabel()"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-xs font-bold tracking-wide text-white">ET</span><span class="min-w-0"><span class="block truncate text-base font-semibold tracking-tight">{{ t('app_name') }}</span><span class="block truncate text-xs text-brand-muted">{{ t('landing_tagline') }}</span></span></a>
        <nav [attr.aria-label]="t('nav_mobile_label')" class="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
          <div role="group" [attr.aria-label]="t('settings_language')" class="landing-language inline-flex rounded-lg border border-brand-border bg-brand-surface-muted p-1">
            @for (language of languages; track language.code) {
              <button type="button" class="min-h-11 rounded-md px-3 text-xs font-semibold transition-colors" [attr.aria-label]="t(language.labelKey)" [attr.aria-pressed]="i18n.language() === language.code" [class.bg-brand-navy]="i18n.language() === language.code" [class.text-white]="i18n.language() === language.code" [class.text-brand-ink]="i18n.language() !== language.code" (click)="changeLanguage(language.code)">{{ language.shortLabel }}</button>
            }
          </div>
          <a mat-button routerLink="/login" class="!min-h-11 !px-3">{{ t('landing_login') }}</a>
          <a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="!min-h-11 !px-4">{{ t('landing_register_short') }}</a>
        </nav>
      </div>
    </header>

    <main id="main-content" tabindex="-1" class="bg-brand-bg text-brand-ink">
      <section class="landing-hero border-b border-brand-border/70">
        <div class="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.9fr)] lg:items-center lg:px-8 lg:py-24">
          <div class="max-w-2xl"><p class="text-sm font-semibold uppercase tracking-[.16em] text-brand-blue">{{ t('landing_eyebrow') }}</p><h1 class="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.04em] sm:text-5xl lg:text-6xl">{{ t('landing_title') }}</h1><p class="mt-6 max-w-xl text-base leading-7 text-brand-muted sm:text-lg">{{ t('landing_description') }}</p><div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"><a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="!min-h-12 !px-6">{{ t('landing_register_short') }}</a><a mat-button routerLink="/login" class="!min-h-12 !px-5">{{ t('landing_login') }}</a></div><p class="mt-3 text-sm text-brand-muted">{{ t('landing_cta_support') }}</p></div>
          <figure class="landing-preview rounded-2xl border border-brand-border bg-brand-surface p-4 sm:p-5" aria-labelledby="product-preview-title">
            <figcaption id="product-preview-title" class="flex items-center justify-between gap-3 border-b border-brand-border pb-4"><span><span class="block text-sm font-semibold">{{ t('landing_preview_title') }}</span><span class="mt-1 block text-xs text-brand-muted">{{ t('landing_preview_label') }}</span></span><span class="rounded-full bg-brand-surface-muted px-3 py-1 text-xs font-semibold text-brand-muted">{{ t('landing_preview_example') }}</span></figcaption>
            <dl class="mt-5 grid gap-3 sm:grid-cols-3" [attr.aria-label]="t('landing_preview_label')">@for (metric of previewMetrics(); track metric.label) {<div class="rounded-xl border border-brand-border bg-brand-surface-muted p-4"><dt class="text-xs font-medium text-brand-muted">{{ metric.label }}</dt><dd class="m-0 mt-2 text-xl font-semibold tracking-tight">{{ metric.value }}</dd></div>}</dl>
            <div class="mt-4 rounded-xl border border-brand-border bg-brand-surface-muted p-4"><p class="text-xs font-semibold uppercase tracking-[.12em] text-brand-blue">{{ t('landing_preview_history_title') }}</p>@for (record of previewHistory(); track record.concept) {<div class="flex items-center justify-between gap-3 border-b border-brand-border/70 py-3 last:border-0 last:pb-0"><div class="min-w-0"><p class="truncate text-sm font-medium">{{ record.concept }}</p><p class="text-xs text-brand-muted">{{ record.meta }}</p></div><span class="shrink-0 text-sm font-semibold">{{ record.amount }}</span></div>}</div>
          </figure>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"><div class="max-w-xl"><p class="text-sm font-semibold uppercase tracking-[.14em] text-brand-blue">{{ t('landing_features_title') }}</p><h2 class="mt-3 text-3xl font-semibold tracking-[-.03em]">{{ t('landing_features_subtitle') }}</h2></div><div class="mt-9 grid gap-4 md:grid-cols-3">@for (feature of features(); track feature.title) {<article class="rounded-xl border border-brand-border bg-brand-surface p-6"><mat-icon aria-hidden="true" class="!h-6 !w-6 text-brand-blue">{{ feature.icon }}</mat-icon><h3 class="mt-5 text-lg font-semibold">{{ feature.title }}</h3><p class="mt-2 text-sm leading-6 text-brand-muted">{{ feature.description }}</p></article>}</div></section>

      <section class="border-y border-brand-border/70 bg-brand-surface"><div class="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[.75fr_1.25fr] lg:items-start lg:px-8"><div><p class="text-sm font-semibold uppercase tracking-[.14em] text-brand-blue">{{ t('landing_how_title') }}</p><h2 class="mt-3 text-3xl font-semibold tracking-[-.03em]">{{ t('landing_how_subtitle') }}</h2></div><ol class="grid gap-3 sm:grid-cols-3">@for (step of steps(); track step.title; let index = $index) {<li class="rounded-xl border border-brand-border bg-brand-bg p-5"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">{{ index + 1 }}</span><h3 class="mt-4 font-semibold">{{ step.title }}</h3><p class="mt-2 text-sm leading-6 text-brand-muted">{{ step.description }}</p></li>}</ol></div></section>
      <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"><div class="rounded-2xl bg-brand-navy px-6 py-10 text-center text-white sm:px-10"><h2 class="text-3xl font-semibold tracking-[-.03em]">{{ t('landing_cta_title') }}</h2><p class="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-200">{{ t('landing_cta_description') }}</p><a mat-flat-button color="primary" routerLink="/login" [queryParams]="{ mode: 'register' }" class="mt-7 !min-h-12 !px-6">{{ t('landing_register_short') }}</a></div></section>
    </main>
    <footer class="border-t border-brand-border/70 bg-brand-surface"><div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-brand-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>{{ t('landing_footer_copy') }}</p><nav class="flex gap-4" [attr.aria-label]="t('landing_footer_copy')"><a routerLink="/terms" class="landing-link hover:text-brand-ink hover:underline">{{ t('landing_footer_terms') }}</a><a routerLink="/privacy" class="landing-link hover:text-brand-ink hover:underline">{{ t('landing_footer_privacy') }}</a></nav></div></footer>
  `
})
export class LandingComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  readonly i18n = inject(I18nService);
  readonly languages = [{ code: 'es' as const, shortLabel: 'ES', labelKey: 'settings_language_es' }, { code: 'en' as const, shortLabel: 'EN', labelKey: 'settings_language_en' }];
  readonly features = computed(() => [{ icon: 'edit_note', title: this.t('landing_feature_chat_title'), description: this.t('landing_feature_chat_desc') }, { icon: 'account_balance_wallet', title: this.t('landing_feature_shared_title'), description: this.t('landing_feature_shared_desc') }, { icon: 'pie_chart', title: this.t('landing_feature_budget_title'), description: this.t('landing_feature_budget_desc') }]);
  readonly steps = computed(() => [{ title: this.t('landing_step_1_title'), description: this.t('landing_step_1_desc') }, { title: this.t('landing_step_2_title'), description: this.t('landing_step_2_desc') }, { title: this.t('landing_step_3_title'), description: this.t('landing_step_3_desc') }]);
  readonly previewMetrics = computed(() => [{ label: this.t('landing_preview_metric_1_label'), value: this.t('landing_preview_metric_1_value') }, { label: this.t('landing_preview_metric_2_label'), value: this.t('landing_preview_metric_2_value') }, { label: this.t('landing_preview_metric_3_label'), value: this.t('landing_preview_metric_3_value') }]);
  readonly previewHistory = computed(() => [{ concept: this.t('landing_preview_history_1_concept'), meta: this.t('landing_preview_history_1_meta'), amount: this.t('landing_preview_history_1_amount') }, { concept: this.t('landing_preview_history_2_concept'), meta: this.t('landing_preview_history_2_meta'), amount: this.t('landing_preview_history_2_amount') }, { concept: this.t('landing_preview_history_3_concept'), meta: this.t('landing_preview_history_3_meta'), amount: this.t('landing_preview_history_3_amount') }]);
  ngOnInit() {
    const routeLanguage = this.router.url === '/en' ? 'en' : 'es';
    this.i18n.usePublicLanguage(routeLanguage);
    this.applyMetadata();
  }
  t(key: string) { return this.i18n.t(key); }
  brandLabel() { return `${this.t('app_name')} — ${this.t('landing_tagline')}`; }
  changeLanguage(language: 'es' | 'en') {
    this.i18n.setLanguage(language);
    void this.router.navigateByUrl(language === 'en' ? '/en' : '/');
  }
  private applyMetadata() {
    const title = this.t('landing_meta_title');
    const description = this.t('landing_meta_description');
    const language = this.i18n.language();
    const canonical = new URL(language === 'en' ? '/en' : '/', environment.publicSiteUrl).toString();
    const spanish = new URL('/', environment.publicSiteUrl).toString();
    const english = new URL('/en', environment.publicSiteUrl).toString();

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.upsertLink('canonical', canonical);
    this.upsertLink('alternate', spanish, 'es');
    this.upsertLink('alternate', english, 'en');
    this.upsertLink('alternate', spanish, 'x-default');
  }

  private upsertLink(rel: string, href: string, hreflang?: string) {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
    const link = this.document.head.querySelector<HTMLLinkElement>(selector) ?? this.document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (hreflang) link.hreflang = hreflang;
    if (!link.parentNode) this.document.head.appendChild(link);
  }
}
