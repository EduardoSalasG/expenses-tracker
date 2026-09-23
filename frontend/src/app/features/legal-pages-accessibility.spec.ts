import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Type } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { PublicContextService } from '../core/public-context.service';
import { PrivacyComponent } from './privacy.component';
import { TermsComponent } from './terms.component';

describe('legal public pages accessibility', () => {
  async function expectAccessiblePublicPage<T>(componentType: Type<T>) {
      await TestBed.configureTestingModule({
        imports: [componentType, RouterTestingModule],
        providers: [
          Meta,
          Title,
          { provide: PublicContextService, useValue: { getContext: () => of({ countryCode: null, language: 'es' as const }) } }
        ]
      }).compileComponents();

      const fixture: ComponentFixture<T> = TestBed.createComponent(componentType);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const main = host.querySelector<HTMLElement>('main#public-main-content');
      const skipLink = host.querySelector<HTMLAnchorElement>('a[href="#public-main-content"]');
      const returnLink = Array.from(host.querySelectorAll<HTMLAnchorElement>('header a[href="/"]'))
        .find((link) => link.textContent?.trim() === 'Volver al inicio');

      expect(skipLink?.textContent?.trim()).toBe('Saltar al contenido principal');
      expect(main?.getAttribute('tabindex')).toBe('-1');
      expect(host.querySelector('header')?.parentElement).not.toBe(main);
      expect(returnLink).withContext('explicit return link').toBeDefined();
  }

  it('TermsComponent provides a skip target and an explicit way back home', async () => {
    await expectAccessiblePublicPage(TermsComponent);
  });

  it('PrivacyComponent provides a skip target and an explicit way back home', async () => {
    await expectAccessiblePublicPage(PrivacyComponent);
  });
});
