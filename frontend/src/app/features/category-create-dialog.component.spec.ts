import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { type Category } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { CategoryCreateDialogComponent } from './category-create-dialog.component';

describe('CategoryCreateDialogComponent', () => {
  let fixture: ComponentFixture<CategoryCreateDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CategoryCreateDialogComponent>>;

  const food: Category = {
    id: 'food',
    tenantId: 'system',
    name: 'Food',
    isDefault: true
  };

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<CategoryCreateDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CategoryCreateDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { categories: [food] } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: I18nService, useValue: { language: signal<'es' | 'en'>('es'), t: (key: string) => key } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryCreateDialogComponent);
    fixture.detectChanges();
  });

  it('closes with a main-category payload when main type is selected', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ type: 'main', parentId: food.id, name: 'Health' });

    component.submit();

    expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Health' });
  });

  it('requires and returns the parent for a subcategory', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ type: 'sub', parentId: food.id, name: 'Delivery' });

    component.submit();

    expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Delivery', parentId: food.id });
  });
});
