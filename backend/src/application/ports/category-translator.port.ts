export interface CategoryTranslationInput {
  name: string;
  parentName?: string;
  role: 'root' | 'subcategory';
}

export interface CategoryTranslationResult {
  nameEs: string;
  nameEn: string;
}

export interface CategoryTranslatorPort {
  translate(input: CategoryTranslationInput): Promise<CategoryTranslationResult | undefined>;
}
