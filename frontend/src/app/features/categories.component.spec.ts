import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  const parent: Category = {
    id: 'food',
    tenantId: 'system',
    name: 'Food',
    isDefault: true
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
    api = jasmine.createSpyObj<ApiService>('ApiService', ['categories', 'createCategory']);
    api.categories.and.returnValues(of([parent]), of([parent, createdSubcategory]));
    api.createCategory.and.returnValue(throwError(() => new Error('response lost')));

    await TestBed.configureTestingModule({
      imports: [CategoriesComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: AccountContextService,
          useValue: { activeAccountId: signal('account-1'), loading: signal(false) }
        },
        { provide: I18nService, useValue: { t: (key: string) => key } },
        { provide: OnboardingService, useValue: { startOnce: () => Promise.resolve() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
  });

  it('reconciles a subcategory that was persisted when the create response fails', () => {
    const component = fixture.componentInstance;
    component.subForm.setValue({ parentId: parent.id, name: createdSubcategory.name });

    component.saveSubcategory();

    expect(component.message()).toBe('categories_created_sub');
    expect(component.categories()).toContain(createdSubcategory);
    expect(component.saving()).toBeFalse();
  });
});
