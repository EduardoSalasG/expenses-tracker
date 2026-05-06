import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {{ message() }}
    </div>
  `
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
}
