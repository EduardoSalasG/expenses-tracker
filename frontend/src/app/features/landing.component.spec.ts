import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { I18nService } from '../core/i18n.service';
import { PublicContextService } from '../core/public-context.service';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let fixture: ComponentFixture<LandingComponent>;
  let i18n: I18nService;
  let meta: Meta;
  let title: Title;

  beforeEach(async () => {
    localStorage.removeItem('expenses_tracker_language');

    await TestBed.configureTestingModule({
      imports: [LandingComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        {
          provide: PublicContextService,
          useValue: { getContext: () => of({ countryCode: null, language: 'es' as const }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    i18n = TestBed.inject(I18nService);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
    fixture.detectChanges();
    TestBed.flushEffects();
  });

  afterEach(() => localStorage.removeItem('expenses_tracker_language'));

  it('uses the public language fallback and sets matching metadata', () => {
    expect(i18n.language()).toBe('es');
    expect(title.getTitle()).toBe('Expenses Tracker | Controla gastos, ingresos y presupuesto');
    expect(meta.getTag('name=description')?.content).toBe('Registra gastos e ingresos desde Telegram o la web. Lleva presupuestos y cuentas compartidas con movimientos y saldos claros.');
  });

  it('lets visitors select a language and updates the metadata', () => {
    const host: HTMLElement = fixture.nativeElement;
    const english = Array.from(host.querySelectorAll<HTMLButtonElement>('[aria-pressed]'))
      .find((control) => control.getAttribute('aria-label') === 'Inglés');

    english?.click();
    fixture.detectChanges();

    expect(english).withContext('English language option').toBeDefined();
    expect(i18n.language()).toBe('en');
    expect(english?.getAttribute('aria-pressed')).toBe('true');
    expect(title.getTitle()).toBe('Expenses Tracker | Track spending, income, and budget');
    expect(meta.getTag('name=description')?.content).toBe('Track expenses and income from Telegram or the web. Manage budgets and shared accounts with clear movements and balances.');
  });

  it('provides a localized skip target, labelled primary navigation, and pressed language controls', () => {
    const host: HTMLElement = fixture.nativeElement;
    const main = host.querySelector<HTMLElement>('main#main-content');
    const skipLink = host.querySelector<HTMLAnchorElement>('a[href="#main-content"]');
    const header = host.querySelector('header');
    const brand = header?.querySelector<HTMLAnchorElement>('a[href="/"]');
    const navigation = host.querySelector('header nav[aria-label="Navegación principal"]');
    const languageGroup = host.querySelector<HTMLElement>('[role="group"][aria-label="Idioma preferido"]');
    const controls = languageGroup?.querySelectorAll<HTMLButtonElement>('[aria-pressed]');

    expect(skipLink).withContext('skip link').not.toBeNull();
    expect(skipLink?.textContent?.trim()).toBe('Saltar al contenido principal');
    expect(main).withContext('main skip target').not.toBeNull();
    expect(header?.parentElement).not.toBe(main);
    expect(brand?.getAttribute('aria-label')).toBe('Expenses Tracker — Control simple para tus gastos e ingresos');
    expect(navigation).not.toBeNull();
    expect(languageGroup).not.toBeNull();
    expect(controls?.length).toBe(2);
    expect(Array.from(controls ?? []).map((control) => control.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  it('marks the dashboard preview as an illustrative figure with labelled metrics', () => {
    const host: HTMLElement = fixture.nativeElement;
    const preview = host.querySelector<HTMLElement>('figure[aria-labelledby="product-preview-title"]');
    const metrics = preview?.querySelector<HTMLDListElement>('dl[aria-label="Resumen del mes"]');

    expect(preview?.querySelector('#product-preview-title')?.textContent).toContain('Así se ve el producto en uso');
    expect(preview?.textContent).toContain('Ejemplo ilustrativo');
    expect(metrics).withContext('labelled metric list').not.toBeNull();
    expect(metrics?.querySelectorAll('dt').length).toBe(3);
    expect(metrics?.querySelectorAll('dd').length).toBe(3);
  });
});
