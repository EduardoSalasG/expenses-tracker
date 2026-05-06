import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="rounded border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400">
        <span class="text-lg">-</span>
      </div>
      <p class="text-sm font-medium text-slate-600">{{ message() }}</p>
    </div>
  `
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
}
