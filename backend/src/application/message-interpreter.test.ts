import { describe, expect, it } from 'vitest';
import { categoryByInterpretedName, inferCategoryCandidateFromText } from './message-interpreter.js';

describe('localized category aliases', () => {
  const categories = [
    { id: 'education', tenantId: 'tenant-1', name: 'Education', nameEs: 'Educación', nameEn: 'Education', isDefault: true },
    { id: 'dance', tenantId: 'tenant-1', name: 'Dance', nameEs: 'Baile', nameEn: 'Dance', parentId: 'education', isDefault: false }
  ];

  it('resolves a Spanish alias to the canonical custom category', () => {
    const match = categoryByInterpretedName(categories, 'Educación', 'Baile');

    expect(match.category).toMatchObject({ id: 'education', name: 'Education' });
    expect(match.subcategory).toMatchObject({ id: 'dance', name: 'Dance' });
  });

  it('infers a localized subcategory alias from free text', () => {
    expect(inferCategoryCandidateFromText(categories, 'Pago de baile')).toMatchObject({
      categoryName: 'Education',
      subcategoryName: 'Dance',
      source: 'exact_subcategory'
    });
  });
});
