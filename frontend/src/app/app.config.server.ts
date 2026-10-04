import { DOCUMENT } from '@angular/common';
import { mergeApplicationConfig, ApplicationConfig, inject } from '@angular/core';
import { BEFORE_APP_SERIALIZED, provideServerRendering } from '@angular/platform-server';
import { Router } from '@angular/router';
import { appConfig } from './app.config';
import { I18nService } from './core/i18n.service';
import { environment } from '../environments/environment';

function serializeLandingStructuredData() {
  const document = inject(DOCUMENT);
  const router = inject(Router);
  const i18n = inject(I18nService);

  return () => {
    if (router.url !== '/' && router.url !== '/en') return;
    const language = router.url === '/en' ? 'en' : 'es';
    i18n.usePublicLanguage(language);
    const canonical = new URL(language === 'en' ? '/en' : '/', environment.publicSiteUrl).toString();
    const socialImage = new URL('/assets/expenses-tracker-social-card.svg', environment.publicSiteUrl).toString();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: i18n.t('app_name'),
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      inLanguage: language,
      url: canonical,
      description: i18n.t('landing_meta_description'),
      image: socialImage
    });
    document.head.appendChild(script);
  };
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    {
      provide: BEFORE_APP_SERIALIZED,
      multi: true,
      useFactory: serializeLandingStructuredData
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
