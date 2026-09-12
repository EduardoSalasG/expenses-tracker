import type { Category } from './api.service';

type Translate = (key: string) => string;

const DEFAULT_CATEGORY_KEYS: Record<string, string> = {
  Food: 'category_default_food',
  Groceries: 'category_default_groceries',
  Restaurants: 'category_default_restaurants',
  Transport: 'category_default_transport',
  'Public Transport': 'category_default_public_transport',
  Uber: 'category_default_uber',
  Housing: 'category_default_housing',
  Rent: 'category_default_rent',
  Health: 'category_default_health',
  Appointments: 'category_default_appointments',
  Medicines: 'category_default_medicines',
  Procedures: 'category_default_procedures',
  Sports: 'category_default_sports',
  Education: 'category_default_education',
  Work: 'category_default_work',
  Services: 'category_default_services',
  Phone: 'category_default_phone',
  Entertainment: 'category_default_entertainment',
  Theater: 'category_default_theater',
  Other: 'category_default_other',
  Gifts: 'category_default_gifts'
};

export function categoryDisplayName(t: Translate, category: Category) {
  if (!category.isDefault) return category.name;
  const key = DEFAULT_CATEGORY_KEYS[category.name];
  return key ? t(key) : category.name;
}

export function categoryPathLabel(
  t: Translate,
  categories: Category[],
  categoryId: string,
  fallback: string
): string {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return fallback;
  const name = categoryDisplayName(t, category);
  if (!category.parentId) return name;
  return `${categoryPathLabel(t, categories, category.parentId, fallback)} / ${name}`;
}
