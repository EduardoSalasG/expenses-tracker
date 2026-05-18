import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="mb-5 flex flex-col gap-4 border-b border-brand-border pb-5 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="text-xs font-medium uppercase tracking-wide text-brand-muted sm:text-sm">{{ eyebrow() }}</p>
        }
        <h1 class="mt-1 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ title() }}</h1>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <ng-content />
      </div>
    </div>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
}
