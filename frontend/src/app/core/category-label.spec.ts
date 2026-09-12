import type { Category } from './api.service';
import { categoryDisplayName, categoryPathLabel } from './category-label';
import { I18nService } from './i18n.service';

describe('category labels', () => {
  let i18n: I18nService;
  let t: (key: string) => string;
  const food: Category = {
    id: 'food',
    tenantId: 'system',
    name: 'Food',
    isDefault: true
  };
  const publicTransport: Category = {
    id: 'public-transport',
    tenantId: 'system',
    name: 'Public Transport',
    parentId: food.id,
    isDefault: true
  };

  beforeEach(() => {
    i18n = new I18nService();
    i18n.setLanguage('es');
    t = (key: string) => i18n.t(key);
  });

  afterEach(() => localStorage.removeItem('expenses_tracker_language'));

  it('translates known default categories and subcategories', () => {
    const spanishNames: Array<[string, string]> = [
      ['Food', 'Comida'],
      ['Groceries', 'Supermercado'],
      ['Restaurants', 'Restaurantes'],
      ['Transport', 'Transporte'],
      ['Public Transport', 'Transporte público'],
      ['Uber', 'Uber'],
      ['Housing', 'Vivienda'],
      ['Rent', 'Arriendo'],
      ['Health', 'Salud'],
      ['Appointments', 'Consultas médicas'],
      ['Medicines', 'Medicamentos'],
      ['Procedures', 'Procedimientos'],
      ['Sports', 'Deportes'],
      ['Education', 'Educación'],
      ['Work', 'Trabajo'],
      ['Services', 'Servicios'],
      ['Phone', 'Telefonía'],
      ['Entertainment', 'Entretenimiento'],
      ['Theater', 'Teatro'],
      ['Other', 'Otros'],
      ['Gifts', 'Regalos']
    ];

    for (const [name, expected] of spanishNames) {
      expect(categoryDisplayName(t, { ...food, id: name, name })).toBe(expected);
    }

    i18n.setLanguage('en');
    expect(categoryDisplayName(t, food)).toBe('Food');
    expect(categoryDisplayName(t, publicTransport)).toBe('Public Transport');
  });

  it('preserves custom category names even when they match a default name', () => {
    expect(categoryDisplayName(t, { ...food, id: 'custom-food', isDefault: false })).toBe('Food');
  });

  it('preserves an unknown default name as a forward-compatible fallback', () => {
    expect(categoryDisplayName(t, { ...food, id: 'future', name: 'Future category' })).toBe('Future category');
  });

  it('builds a translated parent and child path', () => {
    expect(categoryPathLabel(t, [food, publicTransport], publicTransport.id, 'Sin categoria'))
      .toBe('Comida / Transporte público');
  });
});
