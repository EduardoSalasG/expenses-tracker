import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'No hay resultados');
  });

  it('offers an optional recovery action without making the empty-state message interactive', () => {
    const recovered = jasmine.createSpy('recovered');
    fixture.componentRef.setInput('actionLabel', 'Limpiar filtros');
    fixture.componentInstance.action.subscribe(recovered);
    fixture.detectChanges();

    const message = fixture.nativeElement.querySelector('p');
    const action = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    const state = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement | null;

    expect(message?.textContent?.trim()).toBe('No hay resultados');
    expect(state?.getAttribute('aria-live')).toBe('polite');
    expect(action?.textContent?.trim()).toBe('Limpiar filtros');
    action?.click();
    expect(recovered).toHaveBeenCalled();
  });
});
