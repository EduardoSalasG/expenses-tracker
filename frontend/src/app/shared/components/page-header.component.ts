import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="text-sm font-medium uppercase tracking-wide text-slate-500">{{ eyebrow() }}</p>
        }
        <h1 class="mt-1 text-3xl font-semibold text-slate-950">{{ title() }}</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </div>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
}
