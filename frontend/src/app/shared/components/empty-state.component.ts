import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="rounded border border-dashed border-brand-border bg-brand-bg px-5 py-8 text-center">
      <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface text-brand-muted">
        <span class="text-lg">-</span>
      </div>
      <p class="text-sm font-medium text-brand-muted">{{ message() }}</p>
    </div>
  `
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
}
