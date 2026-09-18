import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('hides its decorative marker from assistive technology', async () => {
    await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();
    const fixture: ComponentFixture<EmptyStateComponent> = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'Sin resultados');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('span')?.getAttribute('aria-hidden')).toBe('true');
  });
});
