import { Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-action-priority',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <a
      class="financial-focus financial-priority--{{ tone() }} flex min-h-11 items-start gap-3 rounded-lg border p-4 no-underline transition-colors"
      [routerLink]="link()"
      [queryParams]="queryParams()"
    >
      <mat-icon class="mt-0.5 shrink-0 text-[var(--content-primary)]" aria-hidden="true">{{ tone() === 'danger' ? 'priority_high' : 'info' }}</mat-icon>
      <span class="min-w-0">
        <span class="block font-semibold text-[var(--content-primary)]">{{ title() }}</span>
        <span class="mt-1 block text-sm text-[var(--content-secondary)]">{{ description() }}</span>
      </span>
      <mat-icon class="ml-auto shrink-0 text-[var(--content-secondary)]" aria-hidden="true">chevron_right</mat-icon>
    </a>
  `
})
export class ActionPriorityComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly tone = input<'info' | 'warning' | 'danger'>('info');
  readonly link = input.required<string>();
  readonly queryParams = input<Params>({});
}
