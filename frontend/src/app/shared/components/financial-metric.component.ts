import { Component, input } from '@angular/core';

@Component({
  selector: 'app-financial-metric',
  standalone: true,
  template: `
    <section class="rounded-lg border border-brand-border bg-[var(--surface-raised)] p-4 shadow-sm" [attr.data-tone]="tone()">
      <p class="text-sm font-medium text-[var(--content-secondary)]">{{ label() }}</p>
      <p class="mt-2 text-2xl font-semibold tabular-nums text-[var(--content-primary)]">{{ value() }}</p>
      @if (context()) {
        <p class="mt-2 text-sm text-[var(--content-secondary)]">{{ context() }}</p>
      }
    </section>
  `
})
export class FinancialMetricComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly context = input('');
  readonly tone = input<'neutral' | 'positive' | 'warning' | 'danger'>('neutral');
}
