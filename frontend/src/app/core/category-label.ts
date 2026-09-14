import type { Category } from './api.service';

export function categoryDisplayName(language: 'es' | 'en', category: Category) {
  return language === 'es' ? category.nameEs ?? category.name : category.nameEn ?? category.name;
}

export function categoryPathLabel(
  language: 'es' | 'en',
  categories: Category[],
  categoryId: string,
  fallback: string
): string {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return fallback;
  const name = categoryDisplayName(language, category);
  if (!category.parentId) return name;
  return `${categoryPathLabel(language, categories, category.parentId, fallback)} / ${name}`;
}
