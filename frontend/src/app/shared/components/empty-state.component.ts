import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="rounded border border-dashed border-brand-border bg-brand-bg px-5 py-8 text-center" role="status" aria-live="polite">
      <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface text-brand-muted">
        <span aria-hidden="true" class="text-lg">-</span>
      </div>
      <p class="text-sm font-medium text-brand-muted">{{ message() }}</p>
      @if (actionLabel()) {
        <button type="button" class="mt-4 min-h-11 rounded px-3 text-sm font-semibold text-brand-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly actionLabel = input('');
  readonly action = output<void>();
}
