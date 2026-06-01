import type { Category } from '../../domain/index.js';

export interface NormalizedCategorySelection {
  categoryId: string;
  subcategoryId?: string;
}

export function normalizeCategorySelection(
  categories: Category[],
  categoryId: string,
  subcategoryId?: string
): NormalizedCategorySelection {
  const category = categories.find((item) => item.id === categoryId);
  const requestedSubcategory = subcategoryId ? categories.find((item) => item.id === subcategoryId) : undefined;

  if (requestedSubcategory) {
    // Canonical: categoryId must always be root, subcategoryId optional.
    if (requestedSubcategory.parentId) {
      return {
        categoryId: requestedSubcategory.parentId,
        subcategoryId: requestedSubcategory.id
      };
    }

    return { categoryId: requestedSubcategory.id };
  }

  // If categoryId actually points to a subcategory, rewrite to root + subcategory.
  if (category?.parentId) {
    return {
      categoryId: category.parentId,
      subcategoryId: category.id
    };
  }

  // Already canonical root category.
  return { categoryId };
}

