import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActionPriorityComponent } from './action-priority.component';
import { DisclosurePanelComponent } from './disclosure-panel.component';
import { FinancialMetricComponent } from './financial-metric.component';

describe('financial design primitives', () => {
  it('renders a metric with an accessible financial label and context', async () => {
    await TestBed.configureTestingModule({ imports: [FinancialMetricComponent] }).compileComponents();
    const fixture: ComponentFixture<FinancialMetricComponent> = TestBed.createComponent(FinancialMetricComponent);
    fixture.componentRef.setInput('label', 'Balance neto');
    fixture.componentRef.setInput('value', '$12.000');
    fixture.componentRef.setInput('context', 'Septiembre 2026');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Balance neto');
    expect(fixture.nativeElement.textContent).toContain('$12.000');
    expect(fixture.nativeElement.textContent).toContain('Septiembre 2026');
  });

  it('renders a priority as a keyboard reachable route link', async () => {
    await TestBed.configureTestingModule({ imports: [ActionPriorityComponent, RouterTestingModule] }).compileComponents();
    const fixture: ComponentFixture<ActionPriorityComponent> = TestBed.createComponent(ActionPriorityComponent);
    fixture.componentRef.setInput('title', 'Revisa tu presupuesto');
    fixture.componentRef.setInput('description', 'Comida alcanzó el límite.');
    fixture.componentRef.setInput('link', '/budgets');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toContain('/budgets');
    expect(link?.textContent).toContain('Revisa tu presupuesto');
  });

  it('keeps projected details hidden until the disclosure opens', async () => {
    await TestBed.configureTestingModule({ imports: [DisclosurePanelComponent] }).compileComponents();
    const fixture: ComponentFixture<DisclosurePanelComponent> = TestBed.createComponent(DisclosurePanelComponent);
    fixture.componentRef.setInput('label', 'Más filtros');
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement | null;
    expect(details?.open).toBeFalse();
    expect(fixture.nativeElement.querySelector('summary')?.textContent).toContain('Más filtros');
  });

  it('exposes an optional stable trigger id for guided navigation', async () => {
    await TestBed.configureTestingModule({ imports: [DisclosurePanelComponent] }).compileComponents();
    const fixture: ComponentFixture<DisclosurePanelComponent> = TestBed.createComponent(DisclosurePanelComponent);
    fixture.componentRef.setInput('label', 'Más filtros');
    fixture.componentRef.setInput('triggerId', 'expenses-filter-toggle');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('summary')?.id).toBe('expenses-filter-toggle');
  });
});
