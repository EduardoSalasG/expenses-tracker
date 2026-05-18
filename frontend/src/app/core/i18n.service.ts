import { Injectable, signal } from '@angular/core';

type Language = 'es' | 'en';

const STORAGE_KEY = 'expenses_tracker_language';

const dictionaries: Record<Language, Record<string, string>> = {
  es: {
    app_name: 'Expenses Tracker',
    nav_dashboard: 'Dashboard',
    nav_expenses: 'Gastos',
    nav_incomes: 'Ingresos',
    nav_budgets: 'Presupuestos',
    nav_categories: 'Categorias',
    nav_settings: 'Configuracion',
    nav_home_short: 'Inicio',
    nav_spend_short: 'Gasto',
    nav_income_short: 'Ingreso',
    nav_budget_short: 'Presupuesto',
    nav_categories_short: 'Categorias',
    nav_settings_short: 'Ajustes',
    login_title: 'Expenses Tracker',
    login_subtitle: 'Inicia sesion con tu numero de WhatsApp para registrar tus gastos.',
    login_phone: 'Numero de WhatsApp',
    login_send_code: 'Enviar codigo',
    login_verify_enter: 'Verificar e ingresar',
    settings_title: 'Configuracion',
    settings_subtitle: 'Perfil y preferencias de reportes por WhatsApp',
    settings_language: 'Idioma preferido',
    settings_language_es: 'Espanol',
    settings_language_en: 'Ingles'
  },
  en: {
    app_name: 'Expenses Tracker',
    nav_dashboard: 'Dashboard',
    nav_expenses: 'Expenses',
    nav_incomes: 'Incomes',
    nav_budgets: 'Budgets',
    nav_categories: 'Categories',
    nav_settings: 'Settings',
    nav_home_short: 'Home',
    nav_spend_short: 'Spend',
    nav_income_short: 'Income',
    nav_budget_short: 'Budget',
    nav_categories_short: 'Cats',
    nav_settings_short: 'Prefs',
    login_title: 'Expenses Tracker',
    login_subtitle: 'Sign in with the WhatsApp number you use to track expenses.',
    login_phone: 'WhatsApp phone number',
    login_send_code: 'Send code',
    login_verify_enter: 'Verify and enter',
    settings_title: 'Settings',
    settings_subtitle: 'Profile and WhatsApp report preferences',
    settings_language: 'Preferred language',
    settings_language_es: 'Spanish',
    settings_language_en: 'English'
  }
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly language = signal<Language>(this.detectInitialLanguage());

  t(key: string) {
    return dictionaries[this.language()][key] ?? dictionaries.en[key] ?? key;
  }

  setLanguage(language: Language) {
    this.language.set(language);
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }

  applyUserPreference(language?: string | null) {
    if (language === 'es' || language === 'en') {
      this.setLanguage(language);
    }
  }

  private detectInitialLanguage(): Language {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
    const browser = navigator.language.toLowerCase();
    return browser.startsWith('es') ? 'es' : 'en';
  }
}
