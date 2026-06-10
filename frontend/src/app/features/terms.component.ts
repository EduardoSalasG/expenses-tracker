import { Component, OnInit, computed, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';

type LegalSection = { heading: string; body: string[] };

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="min-h-screen bg-brand-bg text-brand-ink">
      <header class="border-b border-brand-border/80 bg-brand-surface/90 backdrop-blur">
        <div class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a routerLink="/" class="flex items-center gap-3" aria-label="Expenses Tracker home">
            <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy text-sm font-semibold text-white shadow-sm">ET</div>
            <div>
              <div class="text-lg font-semibold tracking-tight">{{ t('app_name') }}</div>
              <div class="text-xs text-brand-muted">{{ t('landing_tagline') }}</div>
            </div>
          </a>
          <a routerLink="/" class="text-sm font-medium text-brand-blue hover:underline">{{ t('common_close') }}</a>
        </div>
      </header>

      <section class="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue">{{ title() }}</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{{ title() }}</h1>
        <p class="mt-4 max-w-3xl text-base leading-7 text-brand-muted">{{ description() }}</p>

        <div class="mt-10 grid gap-6">
          @for (section of sections(); track section.heading) {
            <article class="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm">
              <h2 class="text-xl font-semibold">{{ section.heading }}</h2>
              <div class="mt-3 grid gap-3 text-sm leading-7 text-brand-muted">
                @for (paragraph of section.body; track paragraph) {
                  <p>{{ paragraph }}</p>
                }
              </div>
            </article>
          }
        </div>
      </section>
    </main>
  `
})
export class TermsComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);

  readonly title = computed(() => this.i18n.language() === 'es' ? 'Términos y condiciones' : 'Terms and conditions');
  readonly description = computed(() =>
    this.i18n.language() === 'es'
      ? 'Condiciones de uso del servicio Expenses Tracker para registro personal de gastos, ingresos y presupuesto.'
      : 'Service terms for Expenses Tracker, a personal tool to register expenses, income, and budgets.'
  );
  readonly sections = computed<LegalSection[]>(() => (
    this.i18n.language() === 'es'
      ? [
          {
            heading: 'Uso del servicio',
            body: [
              'Expenses Tracker es una herramienta de uso personal para registrar gastos, ingresos, presupuestos y movimientos asociados a tu cuenta.',
              'Debes usar el servicio de forma lícita y con información veraz. No puedes utilizar la plataforma para interferir con otros usuarios ni para intentar acceder a datos ajenos.'
            ]
          },
          {
            heading: 'Cuenta y acceso',
            body: [
              'Eres responsable de mantener seguros tus accesos, enlaces de inicio de sesión y credenciales.',
              'Si detectas uso no autorizado, debes dejar de usar el enlace comprometido y solicitar uno nuevo.'
            ]
          },
          {
            heading: 'Información registrada',
            body: [
              'Los datos que ingresas se almacenan para mostrar tu historial, paneles, presupuestos, reportes y automatizaciones opcionales como Telegram o correo.',
              'Tú decides qué movimientos registrar. Expenses Tracker no reemplaza asesoría financiera, tributaria ni contable.'
            ]
          },
          {
            heading: 'Disponibilidad y cambios',
            body: [
              'El servicio puede cambiar, actualizarse o interrumpirse temporalmente por mantenimiento, mejoras o fallas operativas.',
              'Podemos ajustar funcionalidades, interfaces o integraciones externas cuando sea necesario para operar mejor el producto.'
            ]
          },
          {
            heading: 'Limitación de responsabilidad',
            body: [
              'Expenses Tracker busca ayudarte a organizar tu información, pero no garantiza exactitud absoluta cuando dependes de datos manuales o integraciones externas.',
              'Siempre debes revisar tus registros antes de tomar decisiones importantes basadas en ellos.'
            ]
          }
        ]
      : [
          {
            heading: 'Service use',
            body: [
              'Expenses Tracker is a personal tool to register expenses, income, budgets, and related account activity.',
              'You must use the service lawfully and provide truthful information. You may not use the platform to interfere with other users or attempt to access other people’s data.'
            ]
          },
          {
            heading: 'Account and access',
            body: [
              'You are responsible for keeping your credentials, sign-in links, and account access secure.',
              'If you detect unauthorized use, stop using the compromised access path and request a new one.'
            ]
          },
          {
            heading: 'Recorded information',
            body: [
              'The data you enter is stored so the app can show your history, dashboards, budgets, reports, and optional automations such as Telegram or email.',
              'You decide what to register. Expenses Tracker does not replace financial, tax, or accounting advice.'
            ]
          },
          {
            heading: 'Availability and changes',
            body: [
              'The service may change or become temporarily unavailable because of maintenance, improvements, or operational incidents.',
              'We may adjust features, interfaces, or external integrations when needed to operate the product properly.'
            ]
          },
          {
            heading: 'Limitation of liability',
            body: [
              'Expenses Tracker is built to help you organize information, but it cannot guarantee absolute accuracy when data depends on manual inputs or third-party integrations.',
              'You should review your records before making important decisions based on them.'
            ]
          }
        ]
  ));

  ngOnInit() {
    this.titleService.setTitle(`${this.title()} | Expenses Tracker`);
    this.meta.updateTag({ name: 'description', content: this.description() });
  }

  t(key: string) {
    return this.i18n.t(key);
  }
}
