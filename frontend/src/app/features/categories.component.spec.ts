import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { AccountContextService } from '../core/account-context.service';
import { ApiService, type Category } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { CategoriesComponent } from './categories.component';

describe('CategoriesComponent', () => {
  let fixture: ComponentFixture<CategoriesComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const parent: Category = {
    id: 'food',
    tenantId: 'system',
    name: 'Food',
    isDefault: true
  };
  const delivery: Category = {
    id: 'delivery',
    tenantId: 'system',
    name: 'Delivery',
    parentId: parent.id,
    isDefault: true
  };
  const leisure: Category = {
    id: 'leisure',
    tenantId: 'tenant-1',
    financialAccountId: 'account-1',
    name: 'Leisure',
    isDefault: false
  };
  const createdSubcategory: Category = {
    id: 'restaurants-custom',
    tenantId: 'tenant-1',
    financialAccountId: 'account-1',
    name: 'Weekend brunch',
    parentId: parent.id,
    isDefault: false
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['categories', 'createCategory', 'periodExpenseCategoryTotals']);
    api.categories.and.returnValues(of([parent, delivery, leisure]), of([parent, delivery, leisure, createdSubcategory]));
    api.createCategory.and.returnValue(throwError(() => new Error('response lost')));
    api.periodExpenseCategoryTotals.and.returnValue(of([
      { categoryId: parent.id, currency: 'CLP', total: 12000 },
      { categoryId: parent.id, subcategoryId: delivery.id, currency: 'USD', total: 20 }
    ]));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [CategoriesComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: AccountContextService,
          useValue: { activeAccountId: signal('account-1'), loading: signal(false) }
        },
        { provide: MatDialog, useValue: dialog },
        { provide: I18nService, useValue: { language: signal<'es' | 'en'>('es'), t: (key: string) => key } },
        { provide: OnboardingService, useValue: { startOnce: () => Promise.resolve() } }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();

    fixture = TestBed.createComponent(CategoriesComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
  });

  it('reconciles a subcategory that was persisted when the create response fails', () => {
    const component = fixture.componentInstance;
    dialog.open.and.returnValue({
      afterClosed: () => of({ name: createdSubcategory.name, parentId: parent.id })
    } as never);

    component.openCreateDialog(parent.id);

    expect(component.message()).toBe('categories_created_sub');
    expect(component.categories()).toContain(createdSubcategory);
    expect(component.saving()).toBeFalse();
  });

  it('keeps a parent visible when the search matches one of its subcategories', () => {
    const component = fixture.componentInstance;

    component.searchTerm.set('delivery');

    expect(component.visibleRootCategories()).toEqual([parent]);
  });

  it('shows only custom roots when the custom library filter is selected', () => {
    const component = fixture.componentInstance;

    component.setLibraryFilter('custom');

    expect(component.visibleRootCategories()).toEqual([leisure]);
  });

  it('keeps library type filters in a progressive disclosure', () => {
    const summary = fixture.nativeElement.querySelector('app-disclosure-panel summary') as HTMLElement | null;

    expect(summary?.textContent).toContain('categories_filter_label');
  });

  it('keeps a root visible when one of its children matches the custom filter', () => {
    const component = fixture.componentInstance;
    const customChild: Category = { ...delivery, id: 'delivery-custom', isDefault: false };
    component.categories.set([parent, customChild]);

    component.setLibraryFilter('custom');

    expect(component.visibleRootCategories()).toEqual([parent]);
  });

  it('includes subcategory spending in the parent activity without combining currencies', () => {
    const component = fixture.componentInstance;

    expect(component.activityLabel(parent.id)).toBe('$12.000 | US$20.00');
  });
});
