import { Component, input } from '@angular/core';

export interface ChartDataRow { label: string; value: string; }

@Component({
  selector: 'app-chart-data-table',
  standalone: true,
  template: `
    <details class="mt-3 rounded border border-brand-border bg-brand-surface-muted p-3">
      <summary class="cursor-pointer font-medium text-brand-ink">{{ label() }}</summary>
      @if (rows().length) {
        <table class="mt-3 w-full text-left text-sm">
          <tbody>
            @for (row of rows(); track row.label) {
              <tr class="border-t border-brand-border/70"><th scope="row" class="py-2 pr-3 font-medium">{{ row.label }}</th><td class="py-2 text-right">{{ row.value }}</td></tr>
            }
          </tbody>
        </table>
      } @else { <p class="mt-3 text-sm text-brand-muted">{{ emptyLabel() }}</p> }
    </details>
  `
})
export class ChartDataTableComponent {
  readonly label = input.required<string>();
  readonly rows = input<ChartDataRow[]>([]);
  readonly emptyLabel = input.required<string>();
}
