import { Component, OnInit, computed, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';

type PrivacySection = { heading: string; body: string[] };

@Component({
  selector: 'app-privacy',
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
export class PrivacyComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);

  readonly title = computed(() => this.i18n.language() === 'es' ? 'Privacidad de datos' : 'Privacy notice');
  readonly description = computed(() =>
    this.i18n.language() === 'es'
      ? 'Cómo Expenses Tracker recopila, usa y protege los datos personales y financieros que registras en tu cuenta.'
      : 'How Expenses Tracker collects, uses, and protects the personal and financial data you register in your account.'
  );
  readonly sections = computed<PrivacySection[]>(() => (
    this.i18n.language() === 'es'
      ? [
          {
            heading: 'Qué datos recopilamos',
            body: [
              'Guardamos los datos de tu cuenta, como nombre, correo, teléfono, idioma, país, moneda preferida y los movimientos financieros que registras.',
              'Si conectas Telegram, también almacenamos el identificador necesario para vincular tu chat con tu cuenta.'
            ]
          },
          {
            heading: 'Para qué usamos tus datos',
            body: [
              'Usamos tu información para autenticarte, mostrar tu historial, generar reportes, calcular presupuestos y habilitar canales opcionales como correo o Telegram.',
              'No usamos tus registros para vender perfiles personales ni para publicidad de terceros dentro del producto.'
            ]
          },
          {
            heading: 'Conservación y seguridad',
            body: [
              'Aplicamos medidas razonables para proteger tu información y limitar accesos no autorizados.',
              'Aun así, ningún sistema conectado a internet puede prometer riesgo cero, por lo que también debes cuidar tus accesos personales.'
            ]
          },
          {
            heading: 'Servicios de terceros',
            body: [
              'Algunas funciones pueden depender de proveedores externos, por ejemplo para correo o mensajería. En esos casos sólo compartimos la información mínima necesaria para que el servicio funcione.',
              'Cada proveedor externo mantiene sus propias políticas y condiciones.'
            ]
          },
          {
            heading: 'Tus decisiones',
            body: [
              'Puedes dejar de usar canales opcionales como Telegram y seguir usando la web como canal principal.',
              'Si necesitas actualizar tus datos personales, puedes hacerlo desde tu configuración de cuenta.'
            ]
          }
        ]
      : [
          {
            heading: 'What data we collect',
            body: [
              'We store account data such as your name, email, phone number, language, country, preferred currency, and the financial movements you register.',
              'If you connect Telegram, we also store the identifier required to link your chat to your account.'
            ]
          },
          {
            heading: 'How we use your data',
            body: [
              'We use your information to authenticate access, show history, generate reports, calculate budgets, and enable optional channels such as email or Telegram.',
              'We do not use your records to sell personal profiles or run third-party advertising inside the product.'
            ]
          },
          {
            heading: 'Retention and security',
            body: [
              'We apply reasonable measures to protect your information and restrict unauthorized access.',
              'No internet-connected system can guarantee zero risk, so you should also protect your own account access.'
            ]
          },
          {
            heading: 'Third-party services',
            body: [
              'Some features depend on external providers, for example for email or messaging. In those cases we only share the minimum information required for the feature to work.',
              'Each external provider keeps its own policies and terms.'
            ]
          },
          {
            heading: 'Your choices',
            body: [
              'You can stop using optional channels such as Telegram and continue using the web as your main channel.',
              'If you need to update your personal data, you can do it from your account settings.'
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
