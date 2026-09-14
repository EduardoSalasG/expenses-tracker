import type { Category } from './api.service';
import { categoryDisplayName, categoryPathLabel } from './category-label';

describe('category labels', () => {
  const food: Category = {
    id: 'food',
    tenantId: 'system',
    name: 'Food',
    nameEs: 'Comida',
    nameEn: 'Food',
    isDefault: true
  };
  const publicTransport: Category = {
    id: 'public-transport',
    tenantId: 'system',
    name: 'Public Transport',
    nameEs: 'Transporte público',
    nameEn: 'Public Transport',
    parentId: food.id,
    isDefault: true
  };

  it('shows persisted labels in the active language for default and custom categories', () => {
    const dance: Category = { id: 'dance', name: 'Dance', nameEs: 'Baile', nameEn: 'Dance', isDefault: false };

    expect(categoryDisplayName('es', food)).toBe('Comida');
    expect(categoryDisplayName('es', dance)).toBe('Baile');
    expect(categoryDisplayName('en', food)).toBe('Food');
    expect(categoryDisplayName('en', dance)).toBe('Dance');
  });

  it('preserves custom category names even when they match a default name', () => {
    expect(categoryDisplayName('es', { ...food, id: 'custom-food', isDefault: false, nameEs: undefined })).toBe('Food');
  });

  it('preserves an unknown default name as a forward-compatible fallback', () => {
    expect(categoryDisplayName('es', { ...food, id: 'future', name: 'Future category', nameEs: undefined })).toBe('Future category');
  });

  it('builds a translated parent and child path', () => {
    expect(categoryPathLabel('es', [food, publicTransport], publicTransport.id, 'Sin categoria'))
      .toBe('Comida / Transporte público');
  });
});
