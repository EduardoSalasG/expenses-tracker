import type { Category } from '../../domain/index.js';
import type { CategoryRepository, CategoryTranslatorPort } from '../ports/index.js';

export class CategoryTranslationService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly translator: CategoryTranslatorPort
  ) {}

  async localize(category: Category, parentName?: string): Promise<Category> {
    if (category.translationSource === 'manual' || (category.nameEs && category.nameEn)) {
      return category;
    }

    try {
      const translation = await this.translator.translate({
        name: category.name,
        parentName,
        role: category.parentId ? 'subcategory' : 'root'
      });
      if (!translation) return category;

      return await this.categories.updateTranslations({
        categoryId: category.id,
        ...translation,
        translationSource: 'automatic'
      }) ?? category;
    } catch {
      return category;
    }
  }
}
